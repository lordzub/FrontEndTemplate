import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Overview from './mycomponents/Overview'
import AdminView from './mycomponents/AdminView'
import axios from 'axios'

function App() {
  const [access, setAccess] = useState('default')

  useEffect(() => {
    // Retrieve the token from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token'); // Assumes the token is passed as a query parameter named 'token'

    if (token) {
      axios.post('https://port-tracker-a42556a33892.herokuapp.com/api/verify', { token })
        .then(response => {
          //console.log(response.data);
          setAccess(response.data.access)

        })
        .catch(error => {
          console.error('Error verifying token:', error)
        })
    } else {
      console.error('No token found in URL');
    }
  }, [])

  return (
    <Router>
      <div className='w-full'>
      {access=='admin'?<><AdminView /></>:<><Overview /></>}
      </div>
    </Router>
  )
}

export default App
