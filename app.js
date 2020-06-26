const express = require("express");
const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");
const path = require("path");
const http = require("http");
const nodemailer = require("nodemailer");
const iCalEvent = require("icalevent");

// iitialize socket
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();

// View engine setup
app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");

const server = http.createServer(app);
const io = socketio(server);

// Static folder
app.use("/public", express.static(path.join(__dirname, "public")));

// Run whenn client connects

io.on("connection", (socket) => {
  const appName = "Chat";
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);
    // Welcomes new user
    console.log("connection");
    socket.emit(
      "message",
      formatMessage(appName, `Hi ${user.username} Welcome to chat`)
    );

    // Broadcast when user connects

    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(appName, `${user.username} has joined the chat`)
      );
    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });
  console.log("New WS connection .... ");

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(appName, `${user.username} has left the chat`)
      );
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.render("index", {
    layout: false,
  });
});
app.get("/dashboard", (req, res) => {
  res.render("dashboard", {
    layout: false,
  });
});

app.get("/join-chatroom", (req, res) => {
  res.render("join-chatroom", {
    layout: false,
  });
});

app.get("/schedule-meeting", (req, res) => {
  res.render("schedule-meeting", {
    layout: false,
  });
});
app.get("/video", (req, res) => {
  res.render("video", {
    layout: false,
  });
});
app.get("/video-upload", (req, res) => {
  res.render("video-upload", {
    layout: false,
  });
});
app.get("/transcribe-video", (req, res) => {
  res.render("transcribe-video", {
    layout: false,
  });
});
app.get("/video-library", (req, res) => {
  res.render("video-library", {
    layout: false,
  });
});
app.post("/send", (req, res) => {
  const recepients = req.body.email;
  const startDateTime = req.body.start_date;
  const endDateTime = req.body.end_date * 1000;
  const milliseconds = endDateTime.toLocaleString();
  console.log(milliseconds);
  const output = `
    <p>You have a new contact request</p>
    <h3>Contact Details</h3>
    <ul>  
      <li>Title: ${req.body.title}</li>
      <li>Start Date / Time: ${req.body.start_date}</li>
      <li>End Date / Time: ${req.body.end_date}</li>
      <li>Location: ${req.body.location}</li>
      <li>Link: ${req.body.url}</li>
    </ul>
    <h3>Agenda</h3>
    <p>${req.body.message}</p>`;
  // ICAL Event code
  let event = new iCalEvent({
    uid: 9873647,
    offset: new Date().getTimezoneOffset(),
    method: "publish",
    status: "confirmed",
    attendees: [
      {
        name: "Cephas Chapa",
        email: "cephaschapa@gmail.com",
      },
      {
        name: "cjr",
        email: "cephaschapa@gmail.com",
      },
    ],
    start: req.body.start_date,
    end: req.body.end_date,
    timezone: "CAT",
    summary: req.body.title,
    description: req.body.message,
    location: req.body.message,
    organizer: {
      name: "Cephas Chapa",
      email: "cephaschapa@gmail.com",
    },
    url: req.body.url,
  });

  console.log(event.start);
  let calenderFile = event.toFile();
  console.log(calenderFile);
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.mailgun.org",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "support@report.probasegroup.com", // generated ethereal user
      pass: "pbs_support", // generated ethereal password
    },
    // tls: {
    //   rejectUnauthorized: false,
    // },
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"Cephas Chapa" <cephaschapa@gmail.com>', // sender address
    to: recepients, // list of receivers
    subject: req.body.title, // Subject line
    text: "Attached to this meeting is a calender", // plain text body
    html: output,

    icalEvent: {
      filename: "meetings-invitation.ics",
      method: "request",
      content: calenderFile,
    },
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    
    res.render(
      "schedule-meeting", {
        layout: false,
        msg: "Invite(s) sent!",
      },
      //{ layout: true },
      
      
    );
    
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started ${PORT}...`));
