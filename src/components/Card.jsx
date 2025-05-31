import React from 'react';
import './Card.css';
import robotImage from './gourdbot.png'; // 그림 파일 이름에 맞게 변경

export function Card({ title, children }) {
    return (
        <div className="app-container">
            <img src={robotImage} alt="Agile Gourd Pot Robot" className="robot-image" />
            <div className="card">
                <h1>GourdPot v1</h1>
                <p>
                    이 로봇은 Agile methodology로 만들어진 단단한 호리병 냄비입니다.<br />
                    민첩함을 잃지 않으면서도 안정성을 갖춘 프로젝트의 메타포입니다.
                </p>
            </div>
        </div>
    );
}