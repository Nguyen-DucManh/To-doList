const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const mysql = require("mysql");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "password",
  database: "cruddatabase",
});

const corsOptions = {
  origin: "http://localhost:3000", 
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const createStoredProcSql = `
DELIMITER $$
CREATE PROCEDURE DeleteAndUpdateId(IN taskName VARCHAR(255))
BEGIN
  DELETE FROM addtask WHERE task = taskName;
  SET @count = 0;
  UPDATE addtask SET id = (@count := @count + 1);
END $$
DELIMITER ;
`;

db.query(createStoredProcSql, (err, result) => {
  if (err) {
    console.log(err);
  } else {
    console.log("Stored procedure created successfully");
  }
});


app.get("/api/get", (req, res) => {
  const sqlSelect = "SELECT * FROM addtask";
  db.query(sqlSelect, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: "An error occurred while fetching tasks." });
    } else {
      res.json(result);
    }
  });
});

app.put("/api/toggle/:task", (req, res) => {
  const taskToUpdate = req.params.task;

  const toggleQuery = `
    UPDATE addtask
    SET completed = NOT completed
    WHERE task = ?;
  `;

  db.query(toggleQuery, [taskToUpdate], (err, result) => {
    if (err) {
      console.error("Error toggling task:", err);
      res.status(500).json({ error: "An error occurred while toggling the task." });
    } else {
      console.log("Toggled successfully");
      res.json({ success: true });
    }
  });
});


app.post("/api/insert", (req, res) => {
  const task = req.body.task;

  const insertQuery = "INSERT INTO addtask (task, position) VALUES (?, (SELECT IFNULL(MAX(position), 0) + 1 FROM addtask))";

  db.query(insertQuery, [task], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: "An error occurred while inserting the task." });
    } else {
      console.log("Inserted successfully");
      res.json({ success: true });
    }
  });
});


app.delete("/api/delete/:task", (req, res) => {
  const taskToDelete = req.params.task;

  const deleteQuery = `
    DELETE FROM addtask WHERE task = ?;
    SET @count = 0;
    UPDATE addtask SET position = (@count := @count + 1);
  `;

  db.query(deleteQuery, [taskToDelete], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: "An error occurred while deleting the task." });
    } else {
      console.log("Deleted successfully");
      res.json({ success: true });
    }
  });
});


app.delete("/api/clear", (req, res) => {
  const sqlDelete = "DELETE FROM addtask";
  db.query(sqlDelete, (err, result) => {
    if (err) {
      console.error("Error clearing list:", err);
      res.json({ success: false });
    } else {
      console.log("List cleared!");

      const sqlResetAutoIncrement = "ALTER TABLE addtask AUTO_INCREMENT = 1";
      db.query(sqlResetAutoIncrement, (err, result) => {
        if (err) {
          console.error("Error resetting auto increment:", err);
          res.json({ success: false });
        } else {
          console.log("ID reset to 1");
          res.json({ success: true });
        }
      });
    }
  });
});

app.put("/api/update/:task", (req, res) => {
  const taskToUpdate = req.params.task;
  const newTask = req.body.newTask;
  const position = req.body.position;

  const sqlUpdate = "UPDATE addtask SET task = ?, position = ? WHERE task = ?";
  db.query(sqlUpdate, [newTask, position, taskToUpdate], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: "An error occurred while updating the task." });
    } else {
      console.log("Updated successfully");
      res.json({ success: true });
    }
  });
});


app.put("/api/reorder", (req, res) => {
const { tasks } = req.body;
const updateTasksSQL = 'UPDATE addtask SET position = ? WHERE task = ?';

tasks.forEach((taskName, index) => {
  db.query(updateTasksSQL, [index, taskName], (err, result) => {
    if (err) {
      db.rollback(() => {
        throw err;
      });
    }
  });
});

db.commit((err) => {
  if (err) {
    db.rollback(() => {
      throw err;
    });
  }
  console.log('Tasks order updated');
  res.sendStatus(200);
});

}); 


app.listen(3001, () => {
  console.log("Server is running on port 3001");
});