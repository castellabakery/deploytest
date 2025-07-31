import React, {useCallback, useEffect, useRef, useState} from 'react';
import SockJS from 'sockjs-client';
import { over } from 'stompjs';
import { v4 as uuidv4 } from 'uuid';
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

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// 1. 고정된 자바 검색 결과 제목 배열
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
const javaSearchResultTitles = [
  "Java NullPointerException: 원인과 해결 방법 총정리",
  "Spring Boot @Transactional 어노테이션의 올바른 사용법 - Stack Overflow",
  "이펙티브 자바 3/E - 아이템 1: 생성자 대신 정적 팩터리 메서드를 고려하라",
  "ArrayList와 LinkedList의 차이점 및 성능 비교 (Java)",
  "Java 8 Stream API 튜토리얼 및 실용 예제 | Baeldung",
  "가비지 컬렉션(GC)의 동작 원리와 종류 (Serial, Parallel, G1GC)",
  "Java의 정석 - 제네릭(Generics)이란 무엇인가?",
  "Spring Security JWT 인증 구현하기 (step-by-step)",
  "CompletableFuture를 이용한 Java 비동기 프로그래밍",
  "JPA N+1 문제의 원인과 해결 방안 (fetch join, @EntityGraph)",
  "객체지향의 5가지 원칙: SOLID - 로버트 C. 마틴",
  "코딩 테스트를 위한 Java 문법 총정리 - programmers",
  "IntelliJ 디버깅 모드 완벽 가이드: Breakpoint 활용하기",
  "RESTful API 설계의 모범 사례 (Best Practices)",
  "Java Reflection API: 동적으로 클래스 정보 수정하기",
  "Checked Exception과 Unchecked Exception의 차이",
  "TCP/IP 소켓 프로그래밍 in Java (예제 포함)",
  "멀티스레드 환경에서의 동기화 문제 해결법 (synchronized, volatile)",
  "디자인 패턴: 싱글턴(Singleton) 패턴 구현 방법 5가지",
  "Docker와 Jenkins를 이용한 Spring Boot 애플리케이션 CI/CD 파이프라인 구축"
];

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// 1. 고정된 자바 검색 결과 내용(스니펫) 배열 추가
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
const javaSearchResultSnippets = [
  "2025. 7. 31. — NullPointerException은 객체 참조가 null일 때 발생합니다. 객체 사용 전 null 체크를 추가하거나 Optional 클래스를 사용하",
  "2025. 6. 10. — Spring의 @Transactional은 AOP 프록시를 통해 작동하므로, public 메서드에만 적용되며 클래스 내부 호출에는 적용되지 않습",
  "2025. 5. 22. — ArrayList는 내부적으로 배열을 사용해 인덱스 조회 속도가 빠르고, LinkedList는 노드 연결로 이루어져 삽입/삭제가 빈번할 때 유리",
  "2025. 4. 1. — Java 8의 Stream API는 데이터 컬렉션을 함수형으로 처리할 수 있게 해주는 강력한 도구입니다. map, filter, collect가 주로 사용",
  "2025. 3. 18. — G1GC는 큰 힙 메모리에서 짧은 GC 일시 중지 시간을 목표로 하는 가비지 컬렉터로, 대부분의 최신 Java 애플리케이션에서 기본으로 사용",
  "2025. 2. 2. — 제네릭(Generics)은 클래스 내부에서 사용할 데이터 타입을 외부에서 지정하는 기법으로, 컴파일 시 타입 체크를 가능하게 하고 코드 재사용성을 높",
  "2025. 1. 15. — JWT(JSON Web Token)는 사용자 인증 정보를 안전하게 전송하기 위한 표준입니다. Header, Payload, Signature 세 부분으로 구성됩니",
  "2024. 12. 5. — CompletableFuture는 자바 5의 Future를 개선한 것으로, 비동기 작업의 조합과 에러 처리를 위한 풍부한 API를 제공합니다.",
  "2024. 11. 20. — JPA의 N+1 문제는 연관 관계가 설정된 엔티티를 조회할 때, 조회된 엔티티 수만큼 추가 쿼리가 발생하는 현상입니다. fetch join으로 해결할 수 있",
  "2024. 10. 8. — SOLID 원칙은 유지보수와 확장이 쉬운 소프트웨어를 만들기 위한 다섯 가지 객체지향 설계 원칙(SRP, OCP, LSP, ISP, DIP)을",
  "2024. 9. 13. — 코딩 테스트에서 시간 복잡도를 줄이는 것은 매우 중요합니다. Java의 HashMap은 평균 O(1)의 시간 복잡도로 데이터 조회/삽",
  "2024. 8. 21. — IntelliJ의 디버깅 모드에서 'Evaluate Expression' 기능을 사용하면, 실행 중인 코드의 상태를 실시간으로 확인하고 변경할 수",
  "2024. 7. 30. — RESTful API에서 리소스 상태 변경은 GET이 아닌 POST, PUT, PATCH, DELETE와 같은 HTTP 메서드를 사용해야 합니",
  "2024. 6. 19. — Java Reflection은 런타임에 클래스의 메타데이터를 얻거나 수정하는 기능입니다. 프레임워크나 라이브러리에서 주로 사용되나, 성능 저하의 원인",
  "2024. 5. 2. — Checked Exception은 반드시 처리(try-catch)해야 하는 예외이며, Unchecked Exception(RuntimeException)은 명시적인 처리를 강제",
  "2024. 4. 11. — Java의 소켓 프로그래밍에서 ServerSocket은 클라이언트의 연결 요청을 기다리고, Socket은 실제 데이터 통신을 담당",
  "2024. 3. 25. — 멀티스레드 환경에서 공유 자원에 대한 동시 접근을 제어하기 위해 synchronized 키워드나 ReentrantLock과 같은 동기화 기법이 사용됩",
  "2024. 2. 7. — 싱글턴 패턴은 애플리케이션 전체에서 단 하나의 인스턴스만 생성되도록 보장하는 디자인 패턴입니다. private 생성자와 static 메서드로 구현할",
  "2024. 1. 18. — Docker 이미지는 애플리케이션과 그 실행 환경을 패키징한 것이며, Jenkins 파이프라인을 통해 이 이미지의 빌드 및 배포를 자동화할 수 있",
  "2023. 12. 1. — Lombok 라이브러리의 @Data 어노테이션은 @Getter, @Setter, @ToString 등을 모두 포함하지만, 불필요한 Setter 생성을 유발할 수 있어 주의"
];

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// 1. 가짜 검색 출처 정보 배열 추가
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
const javaSourceData = [
  { name: 'Tistory', url: 'https://johndoe.tistory.com', icon: 'T', color: '#E96312' },
  { name: 'velog', url: 'https://velog.io/@jane.doe', icon: 'v', color: '#20C997' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com/questions/12345', icon: 'S', color: '#F48024' },
  { name: 'Baeldung', url: 'https://www.baeldung.com/java-tutorial', icon: 'B', color: '#2a9e54' },
  { name: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/java', icon: 'G', color: '#2f9433' },
  { name: '프로그래머스', url: 'https://school.programmers.co.kr/learn', icon: 'P', color: '#4E72B5' },
  { name: 'DZone', url: 'https://dzone.com/java-jdk', icon: 'D', color: '#688e22' },
  { name: 'Medium', url: 'https://medium.com/tag/java', icon: 'M', color: '#121212' }
];

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

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// 1. 파비콘(탭 아이콘)을 가져오거나 새로 만드는 헬퍼 함수
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
const getOrCreateFaviconLink = () => {
  let link = document.querySelector("link[rel*='icon']");
  if (link) {
    return link;
  }
  link = document.createElement('link');
  link.type = 'image/x-icon';
  link.rel = 'shortcut icon';
  document.getElementsByTagName('head')[0].appendChild(link);
  return link;
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

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // 2. 검색 결과 제목 인덱스를 추적할 ref 생성
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const searchResultTitleIndex = useRef(0);
  const searchResultSnippetIndex = useRef(0);
  const sourceIndex = useRef(0);

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // 1. 알림 효과를 위한 Ref 추가
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const intervalRef = useRef(null);
  const originalTitleRef = useRef(document.title);
  const originalFaviconRef = useRef(getOrCreateFaviconLink().href);

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // 2. 알림 시작 및 종료 함수 추가
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const stopNotification = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      document.title = originalTitleRef.current;
      getOrCreateFaviconLink().href = originalFaviconRef.current;
    }
  }, []);

  const startNotification = useCallback(() => {
    if (intervalRef.current) return; // 이미 알림이 실행 중이면 중복 실행 방지

    // const originalTitle = originalTitleRef.current;
    intervalRef.current = setInterval(() => {
      // getOrCreateFaviconLink().href = ;
      // document.title = document.title === originalTitle ? '새 메시지!' : originalTitle;
    }, 1000); // 1초 간격으로 제목 변경
  }, []);


  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // 3. 사용자가 탭으로 돌아왔을 때 알림을 끄는 로직 추가
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 사용자가 탭으로 돌아오면 알림 중지
        stopNotification();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // 컴포넌트가 사라질 때 알림 정리
      stopNotification();
    };
  }, [stopNotification]);


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

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // 1. 메시지에 가짜 데이터를 첨부하는 헬퍼 함수
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const addFakeDataToMessage = (message) => {
    const title = javaSearchResultTitles[searchResultTitleIndex.current % javaSearchResultTitles.length];
    const snippet = javaSearchResultSnippets[searchResultSnippetIndex.current % javaSearchResultSnippets.length];
    const source = javaSourceData[sourceIndex.current % javaSourceData.length];
    const uuid = uuidv4();

    searchResultTitleIndex.current++;
    searchResultSnippetIndex.current++;
    sourceIndex.current++;

    return {
      ...message,
      fakeTitle: title,
      fakeSnippet: snippet,
      fakeSource: source,
      uuid: uuid
    };
  };

  const connect = () => {
    if (!currentRoom) return;
    const socket = new SockJS(SERVER_URL);
    const client = over(socket);
    client.connect({}, () => {
      client.subscribe('/topic/public/'+currentRoom.id, (msg) => {
        const message = JSON.parse(msg.body);
        if (currentRoom && message.roomId === currentRoom.id) {
          // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
          // 3. 새로 받은 메시지에도 가짜 데이터를 '미리' 첨부
          // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
          const augmentedMessage = addFakeDataToMessage(message);

          setMessages(prev => [...prev, augmentedMessage]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'auto' }), 50);

          // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
          // 4. 메시지 수신 시, 탭이 비활성화 상태이면 알림 시작
          // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
          if (document.hidden) {
            startNotification();
          }
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
    const clientDate = new Date();
    const message = {
      sender: username,
      content: content,
      type: type,
      roomId: currentRoom.id,
      roomPassword: currentRoom.password,
      createDateTime: [
        clientDate.getFullYear(),
        clientDate.getMonth() + 1,
        clientDate.getDate(),
        clientDate.getHours(),
        clientDate.getMinutes(),
        clientDate.getSeconds(),
      ]
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
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // 2. 불러온 메시지에 가짜 데이터를 '미리' 첨부
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        const augmentedMessages = newMessages.map(addFakeDataToMessage);

        const chatContainer = chatRef.current;
        const scrollHeightBefore = chatContainer?.scrollHeight;

        if (isInitial) {
          setMessages(augmentedMessages);
        } else {
          setMessages(prev => [...augmentedMessages, ...prev]);
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
    if (!Array.isArray(array) || array.length < 6) return array;
    const [y, m, d, h, min] = array;
    return `${y}년 ${m}월 ${d}일 - ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  const formatTimeForMsg = (array) => {
    if (!Array.isArray(array) || array.length < 6) return array;
    const [y, m, d, h, min] = array;
    return `${y}년 ${m}월 ${d}일`;
  };

  const openModal = (src) => {
    setModalImageSrc(src);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalImageSrc('');
  };

  // const renderMessageContent = (msg) => {
  //   if (msg.type === 'IMAGE' || (typeof msg.content === 'string' && msg.content.startsWith('data:image'))) {
  //     return (
  //         <div className="image-result-box" onClick={() => openModal(msg.content)}>
  //           <img src={msg.content} alt="이미지" />
  //           <p>이미지</p>
  //         </div>
  //     );
  //   }
  //   if (typeof msg.content === 'string') {
  //     return <div className="search-result-snippet">{renderTextWithLinks(msg.content)}</div>;
  //   }
  //   return <div className="search-result-snippet">{msg.content}</div>;
  // };
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // 3. renderMessageContent 함수 약간 수정 (감싸는 div 제거)
  //    - 이제 각 메시지 타입을 순수한 JSX 요소로 반환합니다.
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const renderMessageContent = (msg) => {
    if (msg.type === 'IMAGE' || (typeof msg.content === 'string' && msg.content.startsWith('data:image'))) {
      return (
          <div className="image-result-box" onClick={() => openModal(msg.content)}>
            <img src={msg.content} alt="이미지" />
          </div>
      );
    }
    if (typeof msg.content === 'string') {
      return <>{renderTextWithLinks(msg.content)}</>;
    }
    return <>{msg.content}</>;
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
          <button className="search-button" onClick={sendTextMessage}>
            <span className="KlpaXd z1asCe MZy1Rb"><svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg></span>
          </button>
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

          {messages.map((msg, idx) => {
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // 3. 순서대로 제목을 가져오고, 다음을 위해 인덱스 증가
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            const title = javaSearchResultTitles[searchResultTitleIndex.current % javaSearchResultTitles.length];
            return (
              <div key={msg.id || idx} className="search-result-item chat-message-item">
                {/* 출처 정보 표시 영역 */}
                <div className="search-result-source">
                  <span className="source-icon" style={{ backgroundColor: msg.fakeSource.color }}>{msg.fakeSource.icon}</span>
                  <div className="source-details">
                    <span className="source-name">{msg.fakeSource.name}</span>
                    <span className="source-url">{msg.fakeSource.url}</span>
                  </div>
                </div>

                {/* 제목과 '더보기' 아이콘 표시 영역 */}
                {/*<div className="search-result-header">*/}
                {/*  <button className="header-icon more-options-icon">⋮</button>*/}
                {/*</div>*/}

                <div className="search-result-url">
                  https:// {msg.sender} › {formatTime(msg.createDateTime)} /{msg.uuid}... <span style={{fontSize: '20px'}}>⋮</span>
                </div>
                <h3 className="search-result-title">{title}</h3>
                  <div className="search-result-snippet">{msg.fakeSnippet} ...</div>
                <div className="search-result-url">
                {renderMessageContent(msg)}
                </div>
              </div>
          )})}

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