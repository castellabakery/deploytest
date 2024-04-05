import logo from './logo.svg';
import './App.css';
import React, {useState} from 'react';
import CommonAxios from 'axios';

const NewPromise = (promise) => {
  return new Promise(function (resolve, reject) {
    promise
        .then((response) => {
          if (200 === response.status) {
            resolve(response.data);
          } else {
            reject({error: {}, message: response.statusText});
          }
        })
        .catch((error) => {
          const errorMessage = extractErrorMessage(error);
          reject({error: error, message: errorMessage});
        });
  });
};

const extractErrorMessage = (error) => {
  if (!error) {
    return null;
  }

  const response = error.response;
  let message;
  if (undefined !== response) {
    message = error.response.data;
    if (typeof (message) === 'object') {
      message = message.message;
    }
  } else {
    message = error.message;
  }

  return message;
};

const Axios = CommonAxios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json; charset=UTF-8;',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*'
  }
});

export const getMineral = (data) => NewPromise(Axios.get('/mineral?name='+data.name));

function App() {
  const mineral = (name) => {
    getMineral({
      name: "mineral"
    }).then(res => {
      console.log(res);
      setCount(res.count);
    })
  }

  const [count, setCount] = useState(mineral);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <p>{count}</p>
      </header>
    </div>
  );
}

export default App;
