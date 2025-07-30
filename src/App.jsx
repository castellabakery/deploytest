import React, { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import './ChatApp.css';

// (API 주소 및 외부 함수는 기존과 동일)
const SERVER_HOST = 'https://chitchat.pastelcloud.store';
const SERVER_URL = SERVER_HOST + '/chat';
const ROOM_API = SERVER_HOST + '/room';
const ROOM_LIST_API = SERVER_HOST + '/room/list';
const CHECK_PASSWORD_API = SERVER_HOST + '/room/check/password';
const MESSAGE_API = SERVER_HOST + '/message/list';
const COUNT_API = SERVER_HOST + '/message/count';

const PAGE_SIZE = 50;

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
  // (상태 선언 및 모든 함수는 기존과 동일)
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const [username, setUsername] = useState(localStorage.getItem('chatUsername'));
  const [askingName, setAskingName] = useState(false);

  const chatRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const [nextPage, setNextPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState('');

  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [passwordModal, setPasswordModal] = useState({ visible: false, room: null, error: '' });
  const [passwordInput, setPasswordInput] = useState('');

  const [createRoomModal, setCreateRoomModal] = useState({ visible: false, error: '' });
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');

  const [deleteRoomModal, setDeleteRoomModal] = useState({ visible: false, room: null, error: '' });
  const [deletePasswordInput, setDeletePasswordInput] = useState('');

  const [theme, setTheme] = useState(localStorage.getItem('chatTheme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chatTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (currentRoom) {
      initializeChat();
      connect();
    }

    return () => {
      if (stompClient) {
        stompClient.disconnect();
        setStompClient(null);
      }
    };
  }, [currentRoom]);

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

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch(ROOM_LIST_API);
      if (!res.ok) throw new Error('방 목록 로딩 실패');
      const data = await res.json();
      setRooms(data);
    } catch (error) {
      console.error("방 목록 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeChat = async () => {
    if (!currentRoom) return;
    setLoading(true);
    try {
      const countRes = await fetch(COUNT_API + "?roomId="+currentRoom.id);
      const totalCount = await countRes.json();

      if (totalCount > 0) {
        const lastPage = Math.floor((totalCount - 1) / PAGE_SIZE);
        await loadMessages(lastPage, true);
        setNextPage(lastPage - 1);
        setHasMore(lastPage > 0);
      } else {
        setMessages([]);
        setNextPage(-1);
        setHasMore(false);
      }
    } catch (error) {
      console.error("채팅 초기화 실패:", error);
      setMessages([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = (room) => {
    setPasswordModal({ visible: true, room: room, error: '' });
  };

  const closePasswordModal = () => {
    setPasswordModal({ visible: false, room: null, error: '' });
    setPasswordInput('');
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput) return;

    try {
      const res = await fetch(CHECK_PASSWORD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: passwordModal.room.id,
          roomPassword: passwordInput,
        }),
      });

      const isValid = await res.json();

      if (res.ok && isValid.code !== '1007') {
        setCurrentRoom({
          id: passwordModal.room.id,
          name: passwordModal.room.name,
          password: passwordInput,
        });
        closePasswordModal();
      } else {
        setPasswordModal(prev => ({ ...prev, error: '비밀번호가 올바르지 않습니다.' }));
      }
    } catch (error) {
      console.error("비밀번호 확인 실패:", error);
      setPasswordModal(prev => ({ ...prev, error: '인증 중 오류가 발생했습니다.' }));
    }
  };

  const openCreateRoomModal = () => {
    setCreateRoomModal({ visible: true, error: '' });
  };

  const closeCreateRoomModal = () => {
    setCreateRoomModal({ visible: false, error: '' });
    setNewRoomName('');
    setNewRoomPassword('');
  };

  const handleCreateRoomSubmit = async () => {
    if (!newRoomName || !newRoomPassword) {
      setCreateRoomModal(prev => ({ ...prev, error: '방 이름과 비밀번호를 모두 입력하세요.' }));
      return;
    }

    try {
      const res = await fetch(ROOM_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName,
          password: newRoomPassword,
        }),
      });

      if (res.ok) {
        closeCreateRoomModal();
        loadRooms();
      } else {
        const errorData = await res.json();
        setCreateRoomModal(prev => ({ ...prev, error: errorData.message || '방 생성에 실패했습니다.' }));
      }
    } catch (error) {
      console.error("방 생성 실패:", error);
      setCreateRoomModal(prev => ({ ...prev, error: '방 생성 중 오류가 발생했습니다.' }));
    }
  };

  const openDeleteModal = (room) => {
    setDeleteRoomModal({ visible: true, room: room, error: '' });
  };

  const closeDeleteModal = () => {
    setDeleteRoomModal({ visible: false, room: null, error: '' });
    setDeletePasswordInput('');
  };

  const handleDeleteRoomSubmit = async () => {
    if (!deletePasswordInput) {
      setDeleteRoomModal(prev => ({ ...prev, error: '비밀번호를 입력하세요.' }));
      return;
    }

    try {
      const res = await fetch(ROOM_API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deleteRoomModal.room.id,
          password: deletePasswordInput,
        }),
      });

      if (res.ok) {
        closeDeleteModal();
        loadRooms();
      } else {
        const errorData = await res.json().catch(() => null);
        setDeleteRoomModal(prev => ({ ...prev, error: errorData?.message || '방 삭제에 실패했습니다.' }));
      }
    } catch (error) {
      console.error("방 삭제 실패:", error);
      setDeleteRoomModal(prev => ({ ...prev, error: '방 삭제 중 오류가 발생했습니다.' }));
    }
  };

  const handleExitRoom = () => {
    setCurrentRoom(null);
    setMessages([]);
    setNextPage(0);
    setHasMore(true);
    loadRooms();
  };

  const connect = () => {
    if (!currentRoom) return;
    const socket = new SockJS(SERVER_URL);
    const client = over(socket);
    client.connect({}, () => {
      client.subscribe('/topic/public/'+currentRoom.id, (msg) => {
        const message = JSON.parse(msg.body);
        if (currentRoom && message.roomId === currentRoom.id) {
          setMessages(prev => [...prev, message]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
        }
      });
      client.subscribe('/topic/public/errors', function (error) {
        alert("에러 발생: " + error.body);
      });
      setStompClient(client);
    });
  };

  const sendMessage = (content, type) => {
    if (!content || !stompClient || !currentRoom) return;

    const message = {
      sender: username,
      content: content,
      type: type,
      roomId: currentRoom.id,
      roomPassword: currentRoom.password,
    };
    stompClient.send("/app/sendMessage/"+currentRoom.id, {}, JSON.stringify(message));
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
    if (pageNum < 0 || !currentRoom) {
      setHasMore(false);
      return;
    }
    setLoading(true);
    try {
      const url = `${MESSAGE_API}?page=${pageNum}&size=${PAGE_SIZE}&roomId=${currentRoom.id}`;
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
            <img src={msg.content} alt="이미지" />
            <p>이미지</p>
          </div>
      );
    }
    if (typeof msg.content === 'string') {
      return <div className="search-result-snippet">{renderTextWithLinks(msg.content)}</div>;
    }
    return <div className="search-result-snippet">{msg.content}</div>;
  };

  const handleSetUsername = () => {
    if (username && username.trim()) {
      localStorage.setItem('chatUsername', username.trim());
      setUsername(username.trim());
      setAskingName(false);
    } else {
      localStorage.removeItem('chatUsername');
      setUsername('');
    }
  };

  const changeUsername = () => {
    setAskingName(true);
  };

  const ThemeToggleButton = () => (
      <button onClick={toggleTheme} className="theme-toggle-button">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
  );

  if (askingName || !username) {
    return (
        <div className="google-ui-app">
          <div className="username-prompt">
            <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" style={{width: '150px', marginBottom: '20px'}}/>
            <h2>서비스 사용을 위해 닉네임을 입력하세요.</h2>
            <div className="search-bar-container" style={{maxWidth: '400px', margin: '20px auto'}}>
              <input
                  type="text"
                  value={username || ''}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
                  placeholder="닉네임 입력"
                  autoFocus
              />
            </div>
            <button className="search-button" onClick={handleSetUsername}>입장하기</button>
          </div>
          {/* 닉네임 입력 화면에서는 테마 버튼을 숨겨도 좋지만, 일관성을 위해 유지 */}
        </div>
    );
  }

  if (!currentRoom) {
    return (
        <div className="google-ui-app">
          <div className="search-header">
            <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" className="header-logo"/>
            <div style={{flexGrow: 1}}></div> {/* 빈 공간 채우기 */}
            <ThemeToggleButton />
            <div className="user-profile-icon" onClick={changeUsername}>
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="search-options-bar">
            <span>채팅방 목록</span>
          </div>

          <div className="search-results-container">
            {loading && <div className="loading-indicator">방 목록을 불러오는 중...</div>}
            {rooms.map(room => (
                <div key={room.id} className="search-result-item" onClick={() => handleRoomClick(room)}>
                  <div className="search-result-header">
                    <div>
                      <div className="search-result-url">
                        https://mail.google.com/chat/room/{room.id}
                      </div>
                      <h3 className="search-result-title">{room.name}</h3>
                    </div>
                    <button
                        className="result-action-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(room);
                        }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
            ))}
          </div>

          <button className="create-room-button" onClick={openCreateRoomModal}>+</button>

          {/* Modal JSX... (변경 없음) */}
          {passwordModal.visible && (
              <div className="modal" onClick={closePasswordModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="close-button" onClick={closePasswordModal}>&times;</button>
                  <h3>'{passwordModal.room.name}' 입장</h3>
                  <p>비밀번호를 입력하세요.</p>
                  <div className="search-bar-container" style={{maxWidth: '300px', margin: '20px auto'}}>
                    <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()} placeholder="비밀번호" autoFocus />
                  </div>
                  {passwordModal.error && <p className="error-message">{passwordModal.error}</p>}
                  <button className="search-button" onClick={handlePasswordSubmit}>입장</button>
                </div>
              </div>
          )}

          {createRoomModal.visible && (
              <div className="modal" onClick={closeCreateRoomModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="close-button" onClick={closeCreateRoomModal}>&times;</button>
                  <h3>새 채팅방 만들기</h3>
                  <div className="form-group">
                    <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="방 이름" />
                  </div>
                  <div className="form-group">
                    <input type="password" value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateRoomSubmit()} placeholder="비밀번호" />
                  </div>
                  {createRoomModal.error && <p className="error-message">{createRoomModal.error}</p>}
                  <button className="search-button" onClick={handleCreateRoomSubmit}>만들기</button>
                </div>
              </div>
          )}

          {deleteRoomModal.visible && (
              <div className="modal" onClick={closeDeleteModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="close-button" onClick={closeDeleteModal}>&times;</button>
                  <h3>'{deleteRoomModal.room.name}' 삭제</h3>
                  <p>방을 삭제하려면 비밀번호를 입력하세요. 이 작업은 되돌릴 수 없습니다.</p>
                  <div className="search-bar-container" style={{maxWidth: '300px', margin: '20px auto'}}>
                    <input type="password" value={deletePasswordInput} onChange={(e) => setDeletePasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleDeleteRoomSubmit()} placeholder="비밀번호" autoFocus />
                  </div>
                  {deleteRoomModal.error && <p className="error-message">{deleteRoomModal.error}</p>}
                  <button className="search-button delete-confirm-button" onClick={handleDeleteRoomSubmit}>삭제 확인</button>
                </div>
              </div>
          )}
        </div>
    );
  }

  return (
      <div className="google-ui-app">
        <div className="search-header">
          <span className="back-button" onClick={handleExitRoom}>←</span>
          <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" className="header-logo"/>
          <h1 className="room-title">{currentRoom.name}</h1>
          <div className="search-bar-container">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()} placeholder="메시지 입력..." />
            <div className="search-bar-icons">
              <span className="icon" onClick={() => fileInputRef.current && fileInputRef.current.click()}>📷</span>
            </div>
          </div>
          <button className="search-button" onClick={sendTextMessage}>전송</button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
          <ThemeToggleButton />
          <div className="user-profile-icon" onClick={changeUsername}>
            {username.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="search-results-container" ref={chatRef}>
          {!hasMore && !loading && messages.length > 0 && <div style={{textAlign: 'center', padding: '20px', color: 'var(--text-color-tertiary)'}}>- 더 이상 이전 대화가 없습니다 -</div>}
          {loading && <div style={{textAlign: 'center', padding: '20px'}}>결과를 로드하는 중...</div>}
          {showLoadMoreButton && !loading && hasMore && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <button onClick={() => loadMessages(nextPage)} className="search-button">
                  이전 결과 더보기
                </button>
              </div>
          )}

          {messages.map((msg, idx) => (
              <div key={msg.id || idx} className="search-result-item chat-message-item">
                <div className="search-result-url">
                  {msg.sender} › {formatTime(msg.createDateTime)}
                </div>
                <h3 className="search-result-title">{msg.sender}님의 메시지</h3>
                {renderMessageContent(msg)}
              </div>
          ))}

          <div ref={scrollRef}></div>
        </div>

        {isModalOpen && (
            <div className="modal" onClick={closeModal}>
              <div className="modal-content">
                <img src={modalImageSrc} alt="원본 이미지" />
                <button className="close-button" onClick={closeModal}>&times;</button>
              </div>
            </div>
        )}
      </div>
  );
};

export default ChatApp;