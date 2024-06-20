import logo from './logo.svg';
import './App.css';
import React, {useEffect, useState} from 'react';
import CommonAxios from 'axios';

const { naver } = window;

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

export const getMineral = (data) => NewPromise(Axios.get('/api/mineral?name='+data.name));

function App() {
  useEffect(() => {
    const location = new naver.maps.LatLng(37.481222, 126.952750);
    // 지도에 표시할 위치의 위도와 경도 설정

    // const mapOptions = {
    //   center: location,
    //   // 중앙에 배치할 위치
    //   zoom: 17,
    //   // 확대 단계
    // };
    // const map = new naver.maps.Map('map', mapOptions);
    const map = new naver.maps.Map('map', {
      center: new naver.maps.LatLng(37.481222, 126.952750),
      zoom: 17
    });
    // DOM 요소에 지도 삽입 (지도를 삽입할 HTML 요소의 id, 지도의 옵션 객체)
    new naver.maps.Marker({
      map,
      position: location,
    });
    // 지도에 마커 생성

    // 오버레이 추가
    var rect = new naver.maps.Rectangle({
      map: map,
      bounds: [126.952750,37.481222,126.9590537,37.4864781],
      // bounds: [126.96744,37.561622,126.9737437,37.5668781],
      fillColor: '#ff0000',
      fillOpacity: 0.4,
      strokeWeight: 2,
      strokeColor: '#ff0000'
    });
    var drawingManager;
    naver.maps.Event.once(map, 'init', function() {
      drawingManager = new naver.maps.drawing.DrawingManager({map: map});
      drawingManager.addDrawing(rect, naver.maps.drawing.DrawingMode.RECTANGLE, 'my-id');
      // drawingManager.addDrawing(polygon, naver.maps.drawing.DrawingMode.POLYGON);
    });

    var pano = null;
    pano = new naver.maps.Panorama("pano", {
      position: new naver.maps.LatLng(37.481222, 126.952750),
      // pov: {
      //   pan: -133,
      //   tilt: 0,
      //   fov: 100
      // }
    });
    naver.maps.Event.addListener(pano, "pano_changed", function() {
      console.log("pano_changed1", pano.getLocation());
      pano.getLocation.photodate = "2023-04-23 11:44:16";
      console.log("pano_changed2", pano.getLocation());
    });
    // naver.maps.onJSContentLoaded = function() {
    //   // 아이디 혹은 지도 좌표로 파노라마를 표시할 수 있습니다.
    //   pano = new naver.maps.Panorama("pano", {
    //     position: new naver.maps.LatLng(37.481222, 126.952750),
    //     // pov: {
    //     //   pan: -133,
    //     //   tilt: 0,
    //     //   fov: 100
    //     // }
    //   });
    //
    //   // 파노라마 위치가 갱신되었을 때 발생하는 이벤트를 받아 지도의 중심 위치를 갱신합니다.
    //   // naver.maps.Event.addListener(pano, 'pano_changed', function() {
    //   //   var latlng = pano.getPosition();
    //   //
    //   //   if (!latlng.equals(map.getCenter())) {
    //   //     map.setCenter(latlng);
    //   //   }
    //   // });
    // };

// 거리뷰 레이어를 생성합니다.
    var streetLayer = new naver.maps.StreetLayer();
    naver.maps.Event.once(map, 'init', function() {
      streetLayer.setMap(map);
    });

// 거리뷰 버튼에 이벤트를 바인딩합니다.
    var btn = document.getElementById('street');
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      // 거리뷰 레이어가 지도 위에 있으면 거리뷰 레이어를 지도에서 제거하고,
      // 거리뷰 레이어가 지도 위에 없으면 거리뷰 레이어를 지도에 추가합니다.
      if (streetLayer.getMap()) {
        streetLayer.setMap(null);
      } else {
        streetLayer.setMap(map);
      }
    });

// 거리뷰 레이어가 변경되면 발생하는 이벤트를 지도로부터 받아 버튼의 상태를 변경합니다.
//     naver.maps.Event.addListener(map, 'streetLayer_changed', function(streetLayer) {
//       if (streetLayer) {
//         btn.classList.add('control-on');
//       } else {
//         btn.classList.remove('control-on');
//       }
//     });

// 지도를 클릭했을 때 발생하는 이벤트를 받아 파노라마 위치를 갱신합니다. 이때 거리뷰 레이어가 있을 때만 갱신하도록 합니다.
    naver.maps.Event.addListener(map, 'click', (e) => {
      if (streetLayer.getMap()) {
        var latlng = e.coord;

        // 파노라마의 setPosition()은 해당 위치에서 가장 가까운 파노라마(검색 반경 300미터)를 자동으로 설정합니다.
        console.log("test2>"+pano);
        pano.setPosition(latlng);
      }
    });
  }, []);

  const mineral = (name) => {
    getMineral({
      name: "mineral"
    }).then(res => {
      console.log(res);
      setCount(res.data.count);
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
      <div id={"street"} style={{ width: '100%', height: '500px' }} />
      <div id={"map"} style={{ width: '90%', height: '500px' }} />
      <div id={"pano"} style={{ width: '90%', height: '500px' }} />
    </div>
  );
}

export default App;
