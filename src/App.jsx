import logo from './logo.svg';
import './App.css';

import {Axios} from "../../component";
import {NewPromise} from "../../component/Common";
export const getMineral = (data) => NewPromise(Axios.get('/mineral?name='+data.name));

function App() {
  const [count, setCount] = useState(mineral);
  const mineral = (name) => {
    getMineral({
      name: "mineral"
    }).then(res => {
      console.log(res);
      setCount(res.count);
    })
  }

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
