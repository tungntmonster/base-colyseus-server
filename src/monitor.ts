import axios from "axios";
import { exec } from "child_process";

let processId = 0;

setInterval(async function(){

    try {
      const result = await axios.get('http://localhost:25577/ping-server')
      processId = result.data.processId
      console.log('Ping success', processId);
      
    } catch (error) {
      exec(`kill -9 ${processId} `, ()=>{
        console.log('Kill process', processId);
        
      })
  
    }
  }, 1000)