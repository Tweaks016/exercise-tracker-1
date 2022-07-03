require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const router = express.Router();
const { Schema } = mongoose;

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

resObj = {}
// Connecting to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Model
exerciseTracker = new Schema({
  username: String,
  count: Number,
  log: [{
    _id: false,
    description: String,
    duration: Number,
    date: String
  }],
}, {
    versionKey: false,
  });
let exerciseModel = mongoose.model('exerciseModel', exerciseTracker);

// Create a new user
app.post('/api/users', bodyParser.urlencoded({ extended: false }), (req, res) => {
  exerciseModel({ username: req.body.username }).save((err, savedSuccessfully) => {
    if (!err && savedSuccessfully != undefined) {
      resObj['username'] = savedSuccessfully.username;
      resObj['_id'] = savedSuccessfully._id
      res.json(resObj);
    }
  });
})

// Add exercises 
app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), (req, res) => {
  let idValue = req.params._id;
  // Fetch username
  exerciseModel.findById({ _id: idValue }, (err, val) => {
    if (!err) {
      resObj['username'] = val.username;
      resObj['description'] = req.body.description;
      resObj['duration'] = parseInt(req.body.duration);
      resObj['_id'] = idValue;
      resObj['date'] = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString()
    }
  });
  // Adding exercises to log
  exerciseModel.findByIdAndUpdate((idValue), {
    $push: {
      log: {
        date: resObj.date,
        duration: resObj.duration,
        description: resObj.description
      }
    }
  }, {
      new: true,
      upsert: true,
      _id: false
    }, (err, val) => {
      if (!err) {
        currentCount = val.log.length;
        exerciseModel
          .updateOne({ _id: idValue }, { count: currentCount }, { upsert: true })
          .exec();
        res.json(resObj)
      }
      else {
        res.json({ error: 'User Not Found' });
      }
    });

});

// Retrieve all users
app.get('/api/users', (req, res) => {
  exerciseModel
    .find({})
    .select('username _id')
    .exec((err, val) => {
      if (!err) {
        res.json(val);
      }
    });
});

// Retrieve logs of a user
app.get("/api/users/:_id/logs/?:from?/:to?/:limit?", (req, res) => {
  exerciseModel.findById(req.params._id, (error, result) => {
    if (!error) {
      let resObj = result;

      if (req.query.from || req.query.to) {
        let fromDate = new Date(0).toDateString();
        console.log(fromDate);
        let toDate = new Date().toDateString();
        console.log(toDate);

        if (req.query.from) {
          fromDate = new Date(req.query.from).toDateString();
          console.log("[+]", typeof (fromDate));
        }

        if (req.query.to) {
          toDate = new Date(req.query.to).toDateString();
          console.log("[+]", typeof (toDate));
        }

        fromDate = new Date(fromDate).toDateString();
        toDate = new Date(toDate).toDateString();

        resObj.log = resObj.log.filter((session) => {
          let sessionDate = new Date(session.date).toDateString();

          // console.log("From: ", new Date(fromDate).toDateString());
          // console.log("\nTo: ", new Date(toDate).toDateString());
          // console.log("\nSession: ", new Date(sessionDate).toDateString());
          return sessionDate >= fromDate && sessionDate <= toDate
        });
        // console.log("\n", resObj.log);
      }

      if (req.query.limit) {
        resObj.log = resObj.log.slice(0, req.query.limit);
      }

      resObj = resObj.toJSON();
      resObj["count"] = result.log.length;
      res.json(resObj);
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
