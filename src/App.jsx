import React, { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import './ChatApp.css';

const SERVER_URL = 'https://chitchat.pastelcloud.store/chat';
const MESSAGE_API = 'https://chitchat.pastelcloud.store/message/list';
const SEND_INTERVAL = 100; // 0.1초

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const [username, setUsername] = useState('');
  const [askingName, setAskingName] = useState(true);
  const [warnFastTyping, setWarnFastTyping] = useState(false);
  const lastSendTimeRef = useRef(0);
  const chatRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const storedName = localStorage.getItem('chatUsername');
    if (storedName) {
      setUsername(storedName);
      setAskingName(false);
    }
  }, []);

  useEffect(() => {
    if (!askingName && username) {
      connect();
      loadMessages();
    }
  }, [askingName, username]);

  const handleSetUsername = () => {
    if (username.trim()) {
      localStorage.setItem('chatUsername', username.trim());
      setUsername(username.trim());
      setAskingName(false);
    }
  };

  const changeUsername = () => {
    setAskingName(true);
  };

  const connect = () => {
    const socket = new SockJS(SERVER_URL);
    const client = over(socket);
    client.connect({}, () => {
      client.subscribe('/topic/public', (msg) => {
        const message = JSON.parse(msg.body);
        setMessages(prev => {
          const exists = prev.some(
              (m) => m.sender === message.sender && m.content === message.content && JSON.stringify(m.createDateTime) === JSON.stringify(message.createDateTime)
          );
          return exists ? prev : [...prev, message];
        });
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
      });
      setStompClient(client);
    });
  };

  const sendMessage = () => {
    const now = Date.now();
    if (now - lastSendTimeRef.current < SEND_INTERVAL) {
      setWarnFastTyping(true);
      return;
    }
    setWarnFastTyping(false);
    lastSendTimeRef.current = now;

    if (!input.trim() || !stompClient) return;
    const message = {
      sender: username,
      content: input.trim(),
      type: "CHAT"
    };
    stompClient.send("/app/sendMessage", {}, JSON.stringify(message));
    setInput('');
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(`${MESSAGE_API}?page=0&size=100`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const unique = data.filter(
          (msg, index, self) =>
              index === self.findIndex(
                  (m) => m.sender === msg.sender && m.content === msg.content && JSON.stringify(m.createDateTime) === JSON.stringify(msg.createDateTime)
              )
      );
      setMessages(unique);
      setTimeout(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }, 0);
    } catch {
      console.error('Failed to load messages');
    }
  };

  const formatTime = (array) => {
    if (!Array.isArray(array) || array.length < 6) return '';
    const [y, m, d, h, min, s] = array;
    const date = new Date(y, m - 1, d, h, min, s);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (askingName) {
    return (
        <div className="app">
          <header>Chit Chat</header>
          <div className="username-prompt styled-modal">
            <h2>닉네임을 입력하세요</h2>
            <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
                placeholder="닉네임 입력"
            />
            <button onClick={handleSetUsername}>입장하기</button>
          </div>
        </div>
    );
  }

  return (
      <div className="app">
        <header>
          <span>Chit Chat</span>
          <br/>
          <button className="change-name-btn" onClick={changeUsername}>
            🖊️ 닉네임 변경
          </button>
        </header>
        <div id="chat" ref={chatRef}>
          {messages.map((msg, idx) => (
              <div key={`${msg.sender}-${msg.content}-${msg.createDateTime?.join?.('-') || idx}`} className={`message ${msg.sender === username ? 'me' : 'other'}`}>
                {msg.content}
                <span>{msg.sender}</span>
                {msg.createDateTime && <span>{formatTime(msg.createDateTime)}</span>}
              </div>
          ))}
          <div ref={scrollRef}></div>
        </div>
        <footer>
          {warnFastTyping && (
              <div style={{ color: 'red', fontSize: '0.8rem', marginBottom: '4px' }}>
                메시지를 너무 빠르게 입력하고 있어요. 잠시만 기다려 주세요.
              </div>
          )}
          <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </footer>
      </div>
  );
};

export default ChatApp;