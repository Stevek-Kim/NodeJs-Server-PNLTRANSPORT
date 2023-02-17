const express = require('express')
const app = express()
const http = require('http')
const { Server } = require('socket.io');
const cors = require('cors')
const { google } = require('googleapis')

app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
     cors: {
        //  origin: "http://localhost:3000",
        //  origin: "http://localhost:3001",
        // origin: "http://localhost:1234",
        origin:  "https://script.google.com/macros/s/AKfycbyWRznD_qTIhOnT6qNJFfWU1XP5SzWT5v8fDsBRHj8/dev",
        methods: ["GET","POST"],
     }
})

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: "https://www.googleapis.com/auth/spreadsheets",
});
 // Create client instance for auth
const client = auth.getClient();
// Instance of Google Sheets API
const googleSheets = google.sheets({ version: "v4", auth: client });
const spreadsheetId = "192Odsm4rsz3cKVDJtwN6qrlKnN1Q4K8C7mZLXHH9efo";


io.on("connection", async (socket)=>{

    console.log(`User Connected: ${socket.id}`)

    socket.on("update_data",async (data)=>{

      const getArrayOfBookNums = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Bookings!A2:A"
      })
      const newArray = await getArrayOfBookNums.data.values.map((element)=>{return element[0]})
      const rowIndex = await newArray.indexOf(data.bookNum)+2


      const validityEmail =  await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Bookings!AB"+rowIndex,
      })
// if there is no value in a cell, undefined
    if (validityEmail.data.values === undefined) {     
       await googleSheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: "Bookings!AB"+rowIndex,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values:[[data.driverEmail]]
        }
     })
   } else {
     await io.to(socket.id).emit("handle_alreadyTaken",{msg:"already taken"})
   }


      const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Bookings!A2:AB"
      })
      const sheetKeys = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Bookings!A1:AB1"
      })

      const dataSearched = await getRows.data.values.filter(item=>{return item[21] === "Contractout" && item[27]===undefined})

      let dataSearchedByPending = []; // ---> data will be [{},{},.....]
      
      for(let i = 0; i < dataSearched.length; i++) {
      dataSearchedByPending[i] = await sheetKeys.data.values[0].reduce((accumulator, element, index) => {
         return {...accumulator, [element]: dataSearched[i][index], jobType: "N" }},{}) // ---> the initial value is {} empty object.
      } // ---> 

      const dataSearched1 = getRows.data.values.filter((item)=>{return item[21] === "Contractout" && item[27]=== data.driverEmail})

      let dataSearchedByPending1 = []; // ---> data will be [{},{},.....]
      
      for(let i = 0; i < dataSearched1.length; i++) {
      dataSearchedByPending1[i] = sheetKeys.data.values[0].reduce((accumulator, element, index) => {
         return {...accumulator, [element]: dataSearched1[i][index], jobType: "N" }},{}) // ---> the initial value is {} empty object.
      } // ---> 

      

      // io.emit("return_data",{allPendings:dataSearchedByPending, myJbos:dataSearchedByPending1 })
      // io.emit("return_data",{allPendings:dataSearchedByPending, myJbos:dataSearchedByPending1 })

      io.emit("return_data", dataSearchedByPending) // > send data to everyone connected
      io.to(socket.id).emit("return_data1",dataSearchedByPending1) 



    })

    socket.on("send_message",async (data)=>{

     
      const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Bookings!A2:AB"
      })
      const sheetKeys = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Bookings!A1:AB1"
      })

      const dataSearched = getRows.data.values.filter((item)=>{return item[21] === "Contractout" && item[27]=== undefined})

      let dataSearchedByPending = []; // ---> data will be [{},{},.....]
      
      for(let i = 0; i < dataSearched.length; i++) {
      dataSearchedByPending[i] = sheetKeys.data.values[0].reduce((accumulator, element, index) => {
         return {...accumulator, [element]: dataSearched[i][index], jobType: "N" }},{}) // ---> the initial value is {} empty object.
      } // ---> 

      const dataSearched1 = getRows.data.values.filter((item)=>{return item[21] === "Contractout" && item[27]=== data.driverEmail})

      let dataSearchedByPending1 = []; // ---> data will be [{},{},.....]
      
      for(let i = 0; i < dataSearched1.length; i++) {
      dataSearchedByPending1[i] = sheetKeys.data.values[0].reduce((accumulator, element, index) => {
         return {...accumulator, [element]: dataSearched1[i][index], jobType: "N" }},{}) // ---> the initial value is {} empty object.
      } // ---> 


      //  const dataSearchedByBookNum = getRows.data.values.filter(item=>{return item[21] === "Pending"})

        // socket.broadcast.emit("receive_message",dataSearchedByPending) //> send data to everyone except  me.
        io.emit("receive_message", dataSearchedByPending) // > send data to everyone connected
        io.to(socket.id).emit("receive_message1",dataSearchedByPending1) 
    })

})

// app.get("/", async (req,res) => {
//     const auth = new google.auth.GoogleAuth({
//         keyFile: "credentials.json",
//         scopes: "https://www.googleapis.com/auth/spreadsheets",
//       });
   
//    // Create client instance for auth
//    const client = await auth.getClient();
   
//    // Instance of Google Sheets API

//    const googleSheets = await google.sheets({ version: "v4", auth: client });

//    const spreadsheetId = "192Odsm4rsz3cKVDJtwN6qrlKnN1Q4K8C7mZLXHH9efo";


//    const metaData = await googleSheets.spreadsheets.get({
//     auth,
//     spreadsheetId,
//   });
 
//   const getRows = await googleSheets.spreadsheets.values.get({
//     auth,
//     spreadsheetId,
//     range: "Bookings!A2:AA"
//   })
//   res.send(getRows.data.values.filter(item=>{return item[0] === "10012"}))
//   // res.send(getRows.data.values.filter((item) => {return item[0] === 10012}))
// })


server.listen(3001, (req,res)=>{
     console.log("SERVER IS RUNNING")
})