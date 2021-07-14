const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex')
const bcrypt = require('bcrypt-nodejs');
const clarifai = require('clarifai');

const clarifaiApp = new Clarifai.App({
 apiKey: '85d1dd0ce8bd473484b203c490079220' //Put API Key Here//
});

const handleApiCall = (req, res) => {
clarifaiApp.models
.predict('f76196b43bbd45c99b4f3cd8e8b40a8a',
req.body.input)
.then(data => {
  res.json(data);
})
.catch(err => res.status(400).json('Unable to work with API'))
}

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
    rejectUnauthorized: false
  }
  }
});

const app = express();

app.use(bodyParser.json());
app.use(cors())

app.get('/', (req, res) => {
  res.send('It is working');
})

app.post('/signin', (req, res) => {
const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json('Incorrect form submission')
    alert('Incorrect form submission')
  /*  return res.status(400).json('Incorrect form submission');*/
  }
  db.select('email', 'hash').from('login')
  .where('email', '=', email)
  .then(data => {
    const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
    if (isValid) {
      return db.select('*').from('users')
      .where('email', '=', email)
      .then(user => {
        res.json(user[0])
      })
      .catch(err => res.status(400).json('Unable to get user'))
    } else {
    res.status(400).json('Wrong credentials')
    }
  })
  .catch(err => res.status(400).json('Wrong credentials'))
})

app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json('Incorrect form submission');
  }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
        .returning('*')
        .insert({
          email: loginEmail[0],
          name: name,
          joined: new Date()
        })
        .then(user => {
          res.json(user[0]);
        })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
  .catch(err => res.status(400).json('Unable to register'))
})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  let found = false;
  db.select('*').from('users').where({
    id: id
  }).then(user => {
    if (user.length) {
    res.json(user[0])
  } else {
    res.status(400).json('Not found')
  }
  })
  .catch(err => res.status(400).json('Error getting user'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
      res.json(entries[0]);
    })
    .catch(err => res.status(400).json('Unable to get entries'))
})

app.post('/imageurl', (req, res) => {
  handleApiCall(req, res)
})

app.listen(process.env.PORT || 3001, ()=> {
  console.log(`App is running on port ${process.env.PORT}`);
})
