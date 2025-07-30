import React, { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import './ChatApp.css';

const SERVER_HOST = 'https://chitchat.pastelcloud.store';
const SERVER_URL = SERVER_HOST + '/chat';
const MESSAGE_API = SERVER_HOST + '/message/list';
const COUNT_API = SERVER_HOST + '/message/count';

const PAGE_SIZE = 50;
const SEND_INTERVAL = 500; // 1초 간격

const renderTextWithLinks = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) =>
      urlRegex.test(part) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
      ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
      )
  );
};


const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const [username, setUsername] = useState('');
  const [askingName, setAskingName] = useState(true);

  const chatRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const [nextPage, setNextPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState('');

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  //      도배 방지 관련 상태 및 ref 다시 추가
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const [warnFastTyping, setWarnFastTyping] = useState(false);
  const lastSendTimeRef = useRef(0);


  useEffect(() => {
    const storedName = localStorage.getItem('chatUsername');
    if (storedName) {
      setUsername(storedName);
      setAskingName(false);
    }
  }, []);

  useEffect(() => {
    if (!askingName && username) {
      const initializeChat = async () => {
        setLoading(true);
        try {
          const countRes = await fetch(COUNT_API);
          const totalCount = await countRes.json();

          if (totalCount > 0) {
            const lastPage = Math.floor((totalCount - 1) / PAGE_SIZE);
            await loadMessages(lastPage, true);
            setNextPage(lastPage - 1);
            setHasMore(lastPage > 0);
          } else {
            setHasMore(false);
          }
        } catch (error) {
          console.error("채팅 초기화 실패:", error);
          setHasMore(false);
        } finally {
          setLoading(false);
        }
      };

      connect();
      initializeChat();
    }
  }, [askingName, username]);

  useEffect(() => {
    const chatElement = chatRef.current;
    const handleScroll = () => {
      if (chatElement.scrollTop === 0 && !loading && hasMore) {
        loadMessages(nextPage);
      }
    };

    if (chatElement) {
      chatElement.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (chatElement) {
        chatElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [loading, hasMore, nextPage]);

  useEffect(() => {
    const chatElement = chatRef.current;
    if (loading || !chatElement) return;
    const canScroll = chatElement.scrollHeight > chatElement.clientHeight;
    if (hasMore && !canScroll) {
      setShowLoadMoreButton(true);
    } else {
      setShowLoadMoreButton(false);
    }
  }, [messages, loading, hasMore]);


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
        setMessages(prev => [...prev, message]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
      });
      setStompClient(client);
    });
  };

  const sendMessage = (content, type) => {
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    //      공용 전송 함수에 도배 방지 로직 추가
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    const now = Date.now();
    if (now - lastSendTimeRef.current < SEND_INTERVAL) {
      setWarnFastTyping(true);
      return;
    }
    setWarnFastTyping(false);
    lastSendTimeRef.current = now;

    if (!content || !stompClient) return;
    const clientDate = new Date();
    const message = {
      sender: username,
      content: content,
      type: type,
      createDateTime: [
        clientDate.getFullYear(),
        clientDate.getMonth() + 1,
        clientDate.getDate(),
        clientDate.getHours(),
        clientDate.getMinutes(),
        clientDate.getSeconds(),
      ]
    };
    stompClient.send("/app/sendMessage", {}, JSON.stringify(message));
  };

  const sendTextMessage = () => {
    if (!input.trim()) return;
    sendMessage(input.trim(), "TEXT");
    setInput('');
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Image = reader.result;
      sendMessage(base64Image, "IMAGE");
    };
    reader.onerror = (error) => {
      console.error("파일 읽기 오류:", error);
    };
    event.target.value = null;
  };

  const loadMessages = async (pageNum, isInitial = false) => {
    if (pageNum < 0) {
      setHasMore(false);
      return;
    }
    setLoading(true);
    setShowLoadMoreButton(false);
    try {
      const url = `${MESSAGE_API}?page=${pageNum}&size=${PAGE_SIZE}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('메시지 로딩 실패');

      const newMessages = await res.json();

      if (newMessages && newMessages.length > 0) {
        const chatContainer = chatRef.current;
        const scrollHeightBefore = chatContainer?.scrollHeight;
        const scrollTopBefore = chatContainer?.scrollTop;

        if (isInitial) {
          setMessages(newMessages);
        } else {
          setMessages(prev => [...newMessages, ...prev]);
        }

        setNextPage(pageNum - 1);
        setHasMore(pageNum > 0);

        if (chatContainer && !isInitial) {
          requestAnimationFrame(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight - scrollHeightBefore + scrollTopBefore;
          });
        } else if (chatContainer) {
          setTimeout(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }, 0);
        }
      } else {
        setHasMore(false);
      }
    } catch (error)
    {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (array) => {
    if (!Array.isArray(array) || array.length < 6) return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const [y, m, d, h, min, s] = array;
    const date = new Date(y, m - 1, d, h, min, s);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openModal = (src) => {
    setModalImageSrc(src);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalImageSrc('');
  };

  const renderMessageContent = (msg) => {
    if (msg.type === 'IMAGE' || (typeof msg.content === 'string' && msg.content.startsWith('data:image'))) {
      return (
          <img
              src={msg.content}
              alt="전송된 이미지"
              className="message-image"
              style={{ cursor: 'pointer' }}
              onClick={() => openModal(msg.content)}
          />
      );
    }

    if (typeof msg.content === 'string') {
      return renderTextWithLinks(msg.content);
    }

    return msg.content;
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
          {loading && <div className="loading-indicator">로딩 중...</div>}

          {showLoadMoreButton && !loading && (
              <div style={{ textAlign: 'center', padding: '10px' }}>
                <button onClick={() => loadMessages(nextPage)} className="load-more-btn">
                  이전 대화 불러오기
                </button>
              </div>
          )}

          {!hasMore && !loading && messages.length > 0 && <div className="loading-indicator">- 모든 대화를 불러왔습니다 -</div>}

          {messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`message ${msg.sender === username ? 'me' : 'other'}`}>
                {renderMessageContent(msg)}
                <span>{msg.sender}</span>
                {/*{msg.createDateTime && <span>{formatTime(msg.createDateTime)}</span>}*/}
                <span>{formatTime(msg.createDateTime)}</span>
              </div>
          ))}
          <div ref={scrollRef}></div>
        </div>
        <footer>
          {/* ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★ */}
          {/* 경고 메시지 표시 부분 다시 추가       */}
          {/* ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★ */}
          {warnFastTyping && (
              <div style={{ color: 'red', fontSize: '0.8rem', width: '100%', textAlign: 'center', marginBottom: '4px' }}>
                메시지를 너무 빠르게 보내고 있습니다.
              </div>
          )}
          <div style={{ display: 'flex', width: '100%'}}>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
            />
            <button className="attach-btn" onClick={() => fileInputRef.current.click()}>📎</button>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                placeholder="Type a message..."
            />
            <button onClick={sendTextMessage}>Send</button>
          </div>
        </footer>
        {isModalOpen && (
            <div className="modal" onClick={closeModal}>
              <div className="modal-content">
                <img src={modalImageSrc} alt="원본 이미지" />
                <button className="close-button" onClick={closeModal}>
                  &times;
                </button>
              </div>
            </div>
        )}
      </div>
  );
};

export default ChatApp;