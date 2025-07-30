import React, { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import './ChatApp.css'; // 새로운 CSS 파일을 사용합니다.

const SERVER_HOST = 'https://chitchat.pastelcloud.store';
const SERVER_URL = SERVER_HOST + '/chat';
const MESSAGE_API = SERVER_HOST + '/message/list';
const COUNT_API = SERVER_HOST + '/message/count';

const PAGE_SIZE = 5;

const renderTextWithLinks = (text) => {
  if (typeof text !== 'string') return text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) =>
      urlRegex.test(part) ? (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
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

// App.jsx 파일의 다른 부분은 그대로 두고, 이 함수만 교체하세요.

  const connect = () => {
    const socket = new SockJS(SERVER_URL);
    const client = over(socket);
    client.connect({}, () => {
      client.subscribe('/topic/public', (msg) => {
        // --- 디버깅을 위한 로그 추가 ---
        console.log("✅ 새 메시지 수신 (웹소켓):", msg.body);

        const message = JSON.parse(msg.body);

        setMessages(prev => {
          // 함수형 업데이트를 사용하여 이전 상태를 기반으로 새 상태를 안전하게 반환
          const newState = [...prev, message];
          console.log(`- 메시지 상태 업데이트: 이전 ${prev.length}개 -> 새 ${newState.length}개`);
          return newState;
        });

        // 스크롤 로직은 그대로 유지
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
      });
      setStompClient(client);
    });
  };

  const sendMessage = (content, type) => {
    if (!content || !stompClient) return;

    const message = {
      sender: username,
      content: content,
      type: type,
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

        if (isInitial) {
          setMessages(newMessages);
        } else {
          setMessages(prev => [...newMessages, ...prev]);
        }

        setNextPage(pageNum - 1);
        setHasMore(pageNum > 0);

        if (chatContainer && !isInitial) {
          requestAnimationFrame(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight - scrollHeightBefore;
          });
        } else if (chatContainer) {
          setTimeout(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }, 0);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (array) => {
    if (!Array.isArray(array) || array.length < 6) return '...';
    const [y, m, d, h, min] = array;
    return `${y}년 ${m}월 ${d}일 - ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
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
          <div className="image-result-box" onClick={() => openModal(msg.content)}>
            <img src={msg.content} alt="이미지 검색 결과" />
            <p>이미지 검색 결과</p>
          </div>
      );
    }

    if (typeof msg.content === 'string') {
      return <span className="search-result-snippet">{renderTextWithLinks(msg.content)}</span>;
    }

    return <span className="search-result-snippet">{msg.content}</span>;
  };

  if (askingName) {
    return (
        <div className="google-ui-app">
          <div className="username-prompt">
            <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" style={{width: '150px', marginBottom: '20px'}}/>
            <h2>Chit-Chat 서비스 사용을 위해 닉네임을 입력하세요.</h2>
            <div className="search-bar-container" style={{maxWidth: '400px', margin: '20px auto'}}>
              <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
                  placeholder="닉네임 입력"
              />
            </div>
            <button className="search-button" onClick={handleSetUsername}>입장하기</button>
          </div>
        </div>
    );
  }

  return (
      <div className="google-ui-app">
        {/* Header */}
        <div className="search-header">
          <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" className="header-logo"/>
          <div className="search-bar-container">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
            />
            <div className="search-bar-icons">
              <span className="icon" onClick={() => fileInputRef.current.click()}>📷</span>
              {/*<span className="icon">🎤</span>*/}
              <div className="user-profile-icon" onClick={changeUsername}>
                {username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
          <button className="search-button" onClick={sendTextMessage}>검색</button>
          <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
          />
        </div>
        <div className="search-options-bar">
          <span>전체</span>
          <span>이미지</span>
          <span>뉴스</span>
          <span>동영상</span>
          <span>더보기</span>
        </div>

        {/* Body */}
        <div className="search-results-container" ref={chatRef}>
          {loading && <div className="loading-indicator">결과를 로드하는 중...</div>}
          {showLoadMoreButton && !loading && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <button onClick={() => loadMessages(nextPage)} className="search-button">
                  이전 결과 더보기
                </button>
              </div>
          )}

          {messages.map((msg, idx) => (
              <div key={msg.id || idx} className="search-result-item">
                <div className="search-result-url">
                  https://mail.google.com/chat/{msg.sender} › {formatTime(msg.createDateTime)}
                </div>
                <h3 className="search-result-title">{msg.sender}님의 메시지</h3>
                {renderMessageContent(msg)}
              </div>
          ))}

          {!hasMore && !loading && messages.length > 0 && <div className="loading-indicator" style={{padding: '20px'}}>- 더 이상 이전 대화가 없습니다 -</div>}
          <div ref={scrollRef}></div>
        </div>

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