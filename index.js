const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access 1" });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "Unauthorized Access 2" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.axhfmt5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // const menuCollection = client.db("bistroDB").collection("menu");
    // const reviewCollection = client.db("bistroDB").collection("reviews");
    const paymentCollection = client.db("tuneTutors").collection("payments");

    const userCollection = client.db("tuneTutors").collection("users");
    const instructorsCollection = client
      .db("tuneTutors")
      .collection("instructors");
    const classesCollection = client.db("tuneTutors").collection("classes");
    const enrolledClassCollection = client
      .db("tuneTutors")
      .collection("enrolledClass");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Admin Verify
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access 4" });
      }
      next();
    };

    // User Collection
    app.post("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User Already Exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/allusers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Menu Collection
    // app.delete("/menu/:id", verifyJWT, verifyAdmin, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await menuCollection.deleteOne(query);
    //   res.send(result);
    // });

    // app.post("/menu", verifyJWT, verifyAdmin, async (req, res) => {
    //   const newItem = req.body;
    //   const result = await menuCollection.insertOne(newItem);
    //   res.send(result);
    // });

    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // Instructors Collection
    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    // app.get("/reviews", async (req, res) => {
    //   const result = await reviewCollection.find().toArray();
    //   res.send(result);
    // });

    // EnrolledClass
    app.post("/enrolledClass", async (req, res) => {
      const item = req.body;

      const query = { userEmail: item.userEmail, enrolledId: item.enrolledId };

      const existingEnrolled = await enrolledClassCollection.findOne(query);

      if (existingEnrolled) {
        return res.send({ message: "You have already enrolled this class" });
      }

      console.log(existingEnrolled, "existingEnrolled");
      const result = await enrolledClassCollection.insertOne(item);
      res.send(result);
    });

    app.get("/acquired", verifyJWT, async (req, res) => {
      const queryEmail = req.query.email;
      if (!queryEmail) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      console.log(decodedEmail, "decoded");

      if (queryEmail !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access 3" });
      }

      const query = { userEmail: queryEmail };
      const result = await enrolledClassCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    app.get("/profile", verifyJWT, async (req, res) => {
      const queryEmail = req.query.email;
      if (!queryEmail) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      console.log(decodedEmail, queryEmail, "decoded");

      if (queryEmail !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access 3" });
      }

      const query = { email: queryEmail };
      const result = await userCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    app.delete("/acquired/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await enrolledClassCollection.deleteOne(query);
      res.send(result);
    });

    // // Payment
    // app.post("/create-payment-intent", verifyJWT, async (req, res) => {
    //   const { price } = req.body;
    //   const amount = price * 100;
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount,
    //     currency: "usd",
    //     automatic_payment_methods: {
    //       enabled: true,
    //     },
    //   });

    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // });

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = {
        _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
      };
      const deleteResult = await cartsCollection.deleteMany(query);
      res.send({ insertResult, deleteResult });
    });

    // app.get("/admin-stats", verifyJWT, verifyAdmin, async (req, res) => {
    //   const users = await userCollection.estimatedDocumentCount();
    //   const products = await menuCollection.estimatedDocumentCount();
    //   const orders = await cartsCollection.estimatedDocumentCount();
    //   const payments = await paymentCollection.find().toArray();

    //   const revenue = payments.reduce(
    //     (sum, payment) => sum + payment.amount,
    //     0
    //   );

    //   res.send({
    //     revenue,
    //     users,
    //     products,
    //     orders,
    //   });
    // });

    // app.get("/order-stats", async (req, res) => {
    //   const pipeline = [
    //     {
    //       $lookup: {
    //         from: "menu",
    //         localField: "menuItems",
    //         foreignField: "_id",
    //         as: "menuItemsData",
    //       },
    //     },
    //     {
    //       $unwind: "$menuItemsData",
    //     },
    //     {
    //       $group: {
    //         _id: "$menuItemsData.category",
    //         count: { $sum: 1 },
    //         total: { $sum: "$menuItemsData.price" },
    //       },
    //     },
    //     {
    //       $project: {
    //         category: "$_id",
    //         count: 1,
    //         total: { $round: ["$total", 2] },
    //         _id: 0,
    //       },
    //     },
    //   ];

    //   const result = await paymentCollection.aggregate(pipeline).toArray();
    //   res.send(result);
    // });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (res, req) => {
  req.send("TuneTutors Classroom is open");
});
app.listen(port, () => {
  console.log(`Hei Welcome to TuneTutors , please sit on ${port} `);
});
