const express = require('express')
const app = express()
const http = require('http')

const { Server } = require('socket.io');
const cors = require('cors')
const { google } = require('googleapis')

const AsyncLock = require('async-lock');
const lock = new AsyncLock();

/**
 * @param {String|Array} key 	resource key or keys to lock
 * @param {function} fn 	execute function
 * @param {function} cb 	(optional) callback function, otherwise will return a promise
 * @param {Object} opts 	(optional) options
 */


app.use(cors())

const server = http.createServer(app)
const bodyParserXml = require('body-parser-xml');
const bodyParser = require('body-parser');
const { create } = require('xmlbuilder2');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({
    origin: ['http://localhost:1234','*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }));
app.use(express.json());
const request = require('request');
const fs = require('fs');
const xml2js = require('xml2js');

app.use(bodyParser.text({ type: 'application/xml' }));
bodyParserXml(app);

const { js2xml } = require('xml-js');

app.post('/getxmljob',  (req, res) => {

  
// Define the URL for the web service endpoint
const url = 'https://appsrv.directcouriers.com.au/online/getxmljob.cl';

// const xmlData = await create(req.body).end({ prettyPrint: true });
const xmlString = js2xml(JSON.parse(req.body), { compact: true, spaces: 4 });
console.log(xmlString);

// Read the XML file from disk
// const xmlFilePath = '/Users/stevekim/Desktop/jobxml.xml';
// const xmlFile = fs.createReadStream(xmlFilePath);




const requestOptions = {
  url: url,
  method: 'POST',
  formData: {
    jobxml: xmlString
  }
};

request(requestOptions, function(error, response, body) {
  if (error) {
    console.error(error);
  } else {
    console.log(body);

    request(body, function(error, response, body) {
      if (error) {
        console.error(error);
      } else {
        console.log(body);

        xml2js.parseString(body, (err, result) => {
          if (err) {
            console.error(err);
          } else {
            res.json(result)
          }
        });
      }
    });

  }
});

});


// >  socket io below

const io = new Server(server, {
     cors: {
        //  origin: "http://localhost:3000",
        //  origin: "http://localhost:3001",
        origin: ['http://localhost:1234', '*'],
        // origin:  "https://n-g2y6lzhpbp3kuko4s2uwm42vxxdu6hd4ckcoova-0lu-script.googleusercontent.com",
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


// let allClients = [];
//npm install redis-lock > function lock until done one by one

io.on("connection", async (socket)=>{


// allClients.push(socket);

//   socket.on('disconnect', function() {
//      console.log('Got disconnect!');

//      let i = allClients.indexOf(socket);
//      allClients.splice(i, 1);
//   });

console.log(`User Connected: ${socket.id}`)



  socket.on('test', async ()=>{

const bookNum = '10017'





// ******* start of basic variables 

  const arrOfBookNumsMeta = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    majorDimension: "COLUMNS",
    range: "Bookings!A2:A" // --> from A2 to the lastRow (dynamic)
  }) 
  
  const arrOfBookNums = arrOfBookNumsMeta.data.values[0] // good
  const lastRow = arrOfBookNums.length + 1 // good

  const wholeMetaData = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: `Bookings!A2:${lastRow}`
  })
  
  const wholeData = wholeMetaData.data.values // good

  const sheetKeysMeta = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: "Bookings!A1:1" // --> from A1 to the lastColum (dynamic)
  })

  const sheetKeys = sheetKeysMeta.data.values // 

  const getRowIndex = async (bookNum) =>{
    return arrOfBookNums.indexOf(bookNum)+2
  }

  const rowIndex = await getRowIndex(bookNum)  //




// ******* end of basic variables 

const validityEmail =  await googleSheets.spreadsheets.values.get({
  auth,
  spreadsheetId,
  range: "Bookings!AB"+rowIndex,
})

console.log(validityEmail.data.values[0][0])

    console.log(sheetKeys)

})
  

socket.on("update_data",async (data)=>{

  lock.acquire('key', async function() {
    // return value or promise

  const bookNum = data.bookNum

  // ******* start of basic variables 

  const arrOfBookNumsMeta = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    majorDimension: "COLUMNS",
    range: "Bookings!A2:A" // --> from A2 to the lastRow (dynamic)
  }) 
  
  const arrOfBookNums = arrOfBookNumsMeta.data.values[0] // good
  const lastRow = arrOfBookNums.length + 1 // good


  const sheetKeysMeta = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: "Bookings!A1:1" // --> from A1 to the lastColum (dynamic)
  })

  const sheetKeys = sheetKeysMeta.data.values // 

  const getRowIndex = async (bookNum) =>{
    return arrOfBookNums.indexOf(bookNum)+2
  }

  const rowIndex = await getRowIndex(bookNum)  //

// ******* end of basic variables 

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
        range: "Bookings!AB" + rowIndex,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values:[[data.driverEmail]]
        }
     })
  } 

  if (validityEmail.data.values !== undefined ){
    // let i = allClients.indexOf(socket);
    // await io.to(allClients[i].id).emit("handle_alreadyTaken",{msg:"already taken"})
     await io.to(socket.id).emit("handle_alreadyTaken",{msg:"already taken"})
     return;
   }

   console.log(validityEmail.data.values)

      const wholeMetaData = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: `Bookings!A2:${lastRow}`
      })
      
      const wholeData = wholeMetaData.data.values // good but the correct spot is right here because this has to be the data after update.
      
      const dataSearched = await wholeData.filter(item=>{return item[21] === "Contractout" && item[27]===undefined})

      let dataSearchedByPending = []; // ---> data will be [{},{},.....]
      
      for(let i = 0; i < dataSearched.length; i++) {
      dataSearchedByPending[i] = await sheetKeys[0].reduce((accumulator, element, index) => {
         return {...accumulator, [element]: dataSearched[i][index], jobType: "N" }},{}) // ---> the initial value is {} empty object.
      } // ---> 

      const dataSearched1 = await wholeData.filter((item)=>{return item[21] === "Contractout" && item[27]=== data.driverEmail})

      let dataSearchedByPending1 = []; // ---> data will be [{},{},.....]
      
      for(let i = 0; i < dataSearched1.length; i++) {
      dataSearchedByPending1[i] =  await sheetKeys[0].reduce((accumulator, element, index) => {
         return {...accumulator, [element]: dataSearched1[i][index], jobType: "N" }},{}) // ---> the initial value is {} empty object.
      } // ---> 

      

      // io.emit("return_data",{allPendings:dataSearchedByPending, myJbos:dataSearchedByPending1 })
      // io.emit("return_data",{allPendings:dataSearchedByPending, myJbos:dataSearchedByPending1 })

      io.emit("return_data", dataSearchedByPending) // > send data to everyone connected
      io.to(socket.id).emit("return_data1",dataSearchedByPending1) 

  //  io.to(socket.id).emit("return_data")
}, {timeout:50000}).then(function() {
  // lock released
});

})

 socket.on("send_message",async (data)=>{

  const bookNum = data.bookNum

  // ******* start of basic variables 

  const arrOfBookNumsMeta = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    majorDimension: "COLUMNS",
    range: "Bookings!A2:A" // --> from A2 to the lastRow (dynamic)
  }) 
  
  const arrOfBookNums = arrOfBookNumsMeta.data.values[0] // good
  const lastRow = arrOfBookNums.length + 1 // good


  const sheetKeysMeta = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: "Bookings!A1:1" // --> from A1 to the lastColum (dynamic)
  })

  const sheetKeys = sheetKeysMeta.data.values // 


       const wholeMetaData = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: `Bookings!A2:${lastRow}`
      })
      
      const wholeData = wholeMetaData.data.values // good but the correct spot is right here because this has to be the data after update.
      
      const dataSearched = await wholeData.filter(item=>{return item[21] === "Contractout" && item[27]===undefined})

      let dataSearchedByPending = []; // ---> data will be [{},{},.....]
      
      for(let i = 0; i < dataSearched.length; i++) {
      dataSearchedByPending[i] = await sheetKeys[0].reduce((accumulator, element, index) => {
         return {...accumulator, [element]: dataSearched[i][index], jobType: "N" }},{}) // ---> the initial value is {} empty object.
      } // ---> 

      const dataSearched1 = await wholeData.filter((item)=>{return item[21] === "Contractout" && item[27]=== data.driverEmail})

      let dataSearchedByPending1 = []; // ---> data will be [{},{},.....]
      
      for(let i = 0; i < dataSearched1.length; i++) {
      dataSearchedByPending1[i] =  await sheetKeys[0].reduce((accumulator, element, index) => {
         return {...accumulator, [element]: dataSearched1[i][index], jobType: "N" }},{}) // ---> the initial value is {} empty object.
      } // ---> 

      
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
     console.log("SERVER IS RUNNING ON 3001")
})