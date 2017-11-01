const express = require('express');

const { User, Doc } = require('./models');

module.exports = (passport) => {

  const router = express.Router();

  router.post('/user/findOrCreate', passport.authenticate('local'), (req, res) => {
    // want a list of all documents under this user.
    Doc.find({collaborators: req.user.id})
    .then(docs => {
      res.json({ user: req.user, docs });
    });

  });

  router.use((req, res, next) => {
    if (!req.user) res.status(400).json({message: 'gotta be logged in fa dat ;)'});
    else next();
  });

  router.get('/docs', (req, res) => {
    Doc.find({collaborators: req.user.id}).sort({last_edited: -1})
      .then(resp => {
        res.json({docs: resp});
      })
      .catch(err => {
        res.json({error_message: err});
      });
  });

  router.get('/doc/:docId', (req, res) => {
    Doc.findById(req.params.docId)
      .then(resp => {
        if (resp.collaborators.indexOf(req.user.id) === -1) {
          res.json({message: 'sorry, you are not yet a collaborator on this doc :('});
        }
        else {
          res.json({doc: resp});
        }
      })
      .catch(err => {
        res.json({error_message: err});
      });
  });

  router.post('/doc/new', (req, res) => {
    Doc.create({
      password: req.body.password,
      collaborators: [req.user.id],
      title: req.body.title,
      contents: req.body.contents,
    })
    .then(resp => {
      res.json({doc: resp});
    })
    .catch(err => {
      res.json({error_message: err});
    });
  });

  router.put('/doc/:id', (req, res) => {
    Doc.findById(req.params.id)
      .then(doc => {
        doc.title =  req.body.title || doc.title;
        doc.contents = req.body.contents;
        doc.last_edit = new Date().getTime();
        doc.revision_history = [...doc.revision_history, req.body.contents];
        doc.save(err => {
          if (!err) res.json({doc});
        });
      })
      .catch(err => {
        res.json({error_message: err});
      });
  });


  return router;
};
