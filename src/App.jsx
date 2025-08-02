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
const NOTIFICATION_FAVICON_URL = `https://cc.pastelcloud.store/favicon.ico`;

// 닉네임 앞부분에 사용될 '꾸미는 말' 목록 (100개)
const descriptors = [
  "피리부는", "파도타는", "코딩하는", "여행하는", "춤추는", "게으른", "용감한", "슬픈", "배고픈", "잠자는",
  "화성가는", "노래하는", "그림그리는", "책읽는", "커피마시는", "생각하는", "점프하는", "수영하는", "요리하는", "달리는",
  "숨어있는", "빛나는", "행복한", "우울한", "궁금한", "날아가는", "소리치는", "속삭이는", "꿈꾸는", "별을보는",
  "코파는", "심심한", "수다떠는", "쇼핑하는", "운동하는", "공부하는", "산책하는", "운전하는", "웃고있는", "울고있는",
  "화가난", "신나는", "정리하는", "어지르는", "요가하는", "명상하는", "게임하는", "해킹하는", "디버깅하는", "설계하는",
  "상상하는", "모험하는", "탐험하는", "발명하는", "도망치는", "추격하는", "고민하는", "질문하는", "대답하는", "설득하는",
  "응원하는", "구경하는", "간식먹는", "야식먹는", "낚시하는", "등산하는", "캠핑하는", "뜨개질하는", "농사짓는", "투자하는",
  "알바하는", "하품하는", "재채기하는", "딸꾹질하는", "간지럼타는", "빙글빙글", "반짝이는", "두근대는", "어슬렁", "비틀대는",
  "시를쓰는", "소설읽는", "영화보는", "음악듣는", "코드짜는", "커밋하는", "푸시하는", "머지하는", "배포하는", "롤백하는",
  "최적화된", "느려터진", "우아한", "단단한", "유연한", "투명한", "불투명한", "오래된", "새로운", "미래의"
];
// 닉네임 뒷부분에 사용될 '명사' 목록 (100개)
const nouns = [
  "거북이", "두루미", "불어펜", "개발자", "감자튀김", "알파카", "쿼카", "라이언", "컴퓨터", "외계인",
  "고양이", "강아지", "유령", "히어로", "의자", "책상", "모니터", "키보드", "마우스", "충전기",
  "햄버거", "피자", "치킨", "아이스크림", "솜사탕", "드래곤", "유니콘", "마법사", "요정", "고블린",
  "탐험가", "우주비행사", "해적", "닌자", "사무라이", "기사", "도둑", "궁수", "사자", "호랑이",
  "코끼리", "기린", "하마", "펭귄", "북극곰", "판다", "카피바라", "사막여우", "너구리", "오소리",
  "두더지", "고슴도치", "햄스터", "앵무새", "카나리아", "고래", "상어", "문어", "오징어", "해파리",
  "감자", "고구마", "옥수수", "아보카도", "브로콜리", "파프리카", "선인장", "해바라기", "민들레", "소나무",
  "아파트", "빌라", "주택", "궁전", "오두막", "동굴", "우주선", "잠수함", "비행기", "기차",
  "자전거", "스쿠터", "자동차", "트럭", "로켓", "위성", "블랙홀", "은하수", "초신성", "성운",
  "먼지", "구름", "안개", "바람", "폭풍", "번개", "지진", "화산", "빙하", "사막"
];
// 고정된 자바 검색 결과 제목 배열
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
// 고정된 자바 검색 결과 내용 배열 추가
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
]
// 가짜 검색 출처 정보 배열 추가
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

// 링크 만드는 함수
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
// 닉네임 만드는 함수
const generateRandomNickname = () => {
  // 1. 각 배열에서 무작위로 단어를 선택합니다.
  const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  // 2. 현재 시간을 밀리초 단위의 숫자로 가져옵니다. (고유성 보장)
  const timestamp = Date.now();

  // 3. 단어와 타임스탬프를 조합하여 반환합니다.
  return `${descriptor}_${noun}_${timestamp}`;
}
// 파비콘(탭 아이콘)을 가져오거나 새로 만드는 헬퍼 함수
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
  const [username, setUsername] = useState(localStorage.getItem('chatUsername') == null ? generateRandomNickname() : localStorage.getItem('chatUsername'));
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

  const [messageArrived, setMessageArrived] = useState(false);
  const [isModalAlert, setIsModalAlert] = useState(false);

  const [theme, setTheme] = useState(localStorage.getItem('chatTheme') || 'light');

  // 검색 결과 제목 인덱스를 추적할 ref 생성
  const searchResultTitleIndex = useRef(0);
  const searchResultSnippetIndex = useRef(0);
  const sourceIndex = useRef(0);

  // 알림 효과를 위한 Ref 추가
  const originalTitleRef = useRef(document.title);
  const originalFaviconRef = useRef('https://www.google.com/favicon.ico');

  // 윈도우 포커스 여부를 저장하는 state
  const isWindowFocused = useRef(true);

  useEffect(() => {
    const handleFocus = () => {
      isWindowFocused.current = true;
      setMessageArrived(false);
      stopNotification();
    };

    const handleBlur = () => {
      isWindowFocused.current = false;
    };

    // 이벤트 리스너 등록
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // 컴포넌트가 언마운트될 때 이벤트 리스너 제거 (메모리 누수 방지)
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []); // 빈 배열을 전달하여 컴포넌트 마운트 시 한 번만 실행

  // 알림 종료 함수 추가
  const stopNotification = useCallback(() => {
      document.title = originalTitleRef.current;
    if (originalFaviconRef.current) {
      getOrCreateFaviconLink().href = originalFaviconRef.current;
    }
  }, []);

  // 알림 시작 함수 추가
  const startNotification = useCallback(() => {
      getOrCreateFaviconLink().href = NOTIFICATION_FAVICON_URL;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chatTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const toggleAlert = () => {
    setIsModalAlert(prevAlert => !prevAlert);
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
          // 새로 받은 실시간 메시지에도 고유한 가짜 데이터를 '미리' 할당
          const title = javaSearchResultTitles[searchResultTitleIndex.current % javaSearchResultTitles.length];
          const snippet = javaSearchResultSnippets[searchResultSnippetIndex.current % javaSearchResultSnippets.length];
          const source = javaSourceData[sourceIndex.current % javaSourceData.length];
          const uuid = uuidv4();

          searchResultTitleIndex.current++;
          searchResultSnippetIndex.current++;
          sourceIndex.current++;

          const augmentedMessage = {
            ...message,
            fakeTitle: title,
            fakeSnippet: snippet,
            fakeSource: source,
            uuid: uuid
          };

          setMessages(prev => [...prev, augmentedMessage]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'auto' }), 50);

          // 메시지 수신 시, 탭이 비활성화 상태이면 알림 시작
          if(!isWindowFocused.current) {
            startNotification();
            setMessageArrived(true);
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
        // 불러온 메시지 각각에 고유한 가짜 데이터를 '미리' 할당
        const augmentedMessages = newMessages.map(message => {
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
        });

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
    if (!Array.isArray(array) || array.length < 6 || typeof array === 'string') return new Date(array).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
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
    document.getElementById("coming-modal").style.display = 'none';
    setMessageArrived(false);
  };

  // renderMessageContent 함수 약간 수정 (감싸는 div 제거) - 이제 각 메시지 타입을 순수한 JSX 요소로 반환합니다.
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
      <button onClick={toggleTheme} className="header-icon theme-toggle-button">
        {theme === 'light' ? (
            <svg focusable="false" xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><rect fill="none" height="24" width="24"></rect><path d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"></path></svg>
        ) : (
            <svg focusable="false" xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><rect fill="none" height="24" width="24"></rect><path d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z"></path></svg>
        )}
      </button>
  );

  const AlertToggleButton = () => (
      <button onClick={toggleAlert} className="header-icon theme-toggle-button">
        {isModalAlert ? (
            <svg height="24" width="24" className="goxjub" focusable="false" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm-40 280v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Z"></path></svg>
        ) : (
            <svg height="24" width="24" className="goxjub" focusable="false" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path fill="#bfbfbf" d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm-40 280v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Z"></path></svg>
        )}
      </button>
  );

  if (askingName) {
    return (
        <div className="google-ui-app">
          <div className="username-prompt">
            <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" className="logo-light" style={{width: '150px', marginBottom: '20px'}}/>
            <svg style={{width: '150px', marginBottom: '20px'}} className="logo-dark" height="92" viewBox="0 0 92 30" width="272" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M38.9 15.51c0 4.26-3.32 7.39-7.4 7.39s-7.4-3.14-7.4-7.39c0-4.28 3.32-7.39 7.4-7.39s7.4 3.1 7.4 7.39zm-3.24 0c0-2.66-1.93-4.48-4.16-4.48-2.23 0-4.16 1.82-4.16 4.48 0 2.63 1.93 4.48 4.16 4.48 2.23 0 4.16-1.85 4.16-4.48zm-23.7 7.47C5.63 22.98.31 17.83.31 11.5S5.63.02 11.96.02c3.5 0 5.99 1.37 7.87 3.16L17.62 5.4c-1.34-1.26-3.16-2.24-5.66-2.24-4.62 0-8.23 3.72-8.23 8.34 0 4.62 3.61 8.34 8.23 8.34 3 0 4.7-1.2 5.79-2.3.9-.9 1.49-2.2 1.74-4.17H12v-3.14h10.52c.11.56.17 1.23.17 1.96 0 2.35-.64 5.49-2.72 7.56-2.02 2.11-4.59 3.23-8.01 3.23zm42.94-7.47c0 4.26-3.32 7.39-7.4 7.39s-7.4-3.14-7.4-7.39c0-4.28 3.32-7.39 7.4-7.39s7.4 3.1 7.4 7.39zm-3.24 0c0-2.66-1.93-4.48-4.16-4.48-2.23 0-4.16 1.82-4.16 4.48 0 2.63 1.93 4.48 4.16 4.48 2.23 0 4.16-1.85 4.16-4.48zM70 8.56v13.27c0 5.46-3.05 7.7-6.86 7.7-3.58 0-5.74-2.41-6.55-4.37l2.83-1.18c.5 1.2 1.74 2.63 3.72 2.63 2.44 0 3.78-1.51 3.78-4.34v-1.06h-.11c-.73.9-2.04 1.68-3.81 1.68-3.7 0-7-3.22-7-7.36 0-4.17 3.3-7.42 7-7.42 1.76 0 3.08.78 3.81 1.65h.11v-1.2H70zm-2.86 6.97c0-2.6-1.74-4.51-3.95-4.51-2.24 0-3.95 1.9-3.95 4.51 0 2.58 1.71 4.45 3.95 4.45 2.22.01 3.95-1.87 3.95-4.45zM75 1.17V22.9h-3V1.17h3zm12.5 16.77l2.48 1.68c-.8 1.2-2.73 3.28-6.06 3.28-4.13 0-7.22-3.25-7.22-7.39 0-4.4 3.11-7.39 6.86-7.39 3.78 0 5.62 3.05 6.23 4.7l.31.85-9.71 4.08c.74 1.48 1.9 2.24 3.53 2.24s2.76-.82 3.58-2.05zm-7.63-2.66l6.5-2.74c-.36-.92-1.43-1.57-2.7-1.57-1.62 0-3.88 1.46-3.8 4.31z"></path></svg>
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
            <button className="search-button" onClick={handleSetUsername}>변경하기</button>
          </div>
          {/* 닉네임 입력 화면에서는 테마 버튼을 숨겨도 좋지만, 일관성을 위해 유지 */}
        </div>
    );
  }

  if (!currentRoom) {
    return (
        <div className="google-ui-app">
          <div className="search-header">
            <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" className="header-logo logo-light"/>
            <svg className="header-logo logo-dark" height="30" viewBox="0 0 92 30" width="92" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M38.9 15.51c0 4.26-3.32 7.39-7.4 7.39s-7.4-3.14-7.4-7.39c0-4.28 3.32-7.39 7.4-7.39s7.4 3.1 7.4 7.39zm-3.24 0c0-2.66-1.93-4.48-4.16-4.48-2.23 0-4.16 1.82-4.16 4.48 0 2.63 1.93 4.48 4.16 4.48 2.23 0 4.16-1.85 4.16-4.48zm-23.7 7.47C5.63 22.98.31 17.83.31 11.5S5.63.02 11.96.02c3.5 0 5.99 1.37 7.87 3.16L17.62 5.4c-1.34-1.26-3.16-2.24-5.66-2.24-4.62 0-8.23 3.72-8.23 8.34 0 4.62 3.61 8.34 8.23 8.34 3 0 4.7-1.2 5.79-2.3.9-.9 1.49-2.2 1.74-4.17H12v-3.14h10.52c.11.56.17 1.23.17 1.96 0 2.35-.64 5.49-2.72 7.56-2.02 2.11-4.59 3.23-8.01 3.23zm42.94-7.47c0 4.26-3.32 7.39-7.4 7.39s-7.4-3.14-7.4-7.39c0-4.28 3.32-7.39 7.4-7.39s7.4 3.1 7.4 7.39zm-3.24 0c0-2.66-1.93-4.48-4.16-4.48-2.23 0-4.16 1.82-4.16 4.48 0 2.63 1.93 4.48 4.16 4.48 2.23 0 4.16-1.85 4.16-4.48zM70 8.56v13.27c0 5.46-3.05 7.7-6.86 7.7-3.58 0-5.74-2.41-6.55-4.37l2.83-1.18c.5 1.2 1.74 2.63 3.72 2.63 2.44 0 3.78-1.51 3.78-4.34v-1.06h-.11c-.73.9-2.04 1.68-3.81 1.68-3.7 0-7-3.22-7-7.36 0-4.17 3.3-7.42 7-7.42 1.76 0 3.08.78 3.81 1.65h.11v-1.2H70zm-2.86 6.97c0-2.6-1.74-4.51-3.95-4.51-2.24 0-3.95 1.9-3.95 4.51 0 2.58 1.71 4.45 3.95 4.45 2.22.01 3.95-1.87 3.95-4.45zM75 1.17V22.9h-3V1.17h3zm12.5 16.77l2.48 1.68c-.8 1.2-2.73 3.28-6.06 3.28-4.13 0-7.22-3.25-7.22-7.39 0-4.4 3.11-7.39 6.86-7.39 3.78 0 5.62 3.05 6.23 4.7l.31.85-9.71 4.08c.74 1.48 1.9 2.24 3.53 2.24s2.76-.82 3.58-2.05zm-7.63-2.66l6.5-2.74c-.36-.92-1.43-1.57-2.7-1.57-1.62 0-3.88 1.46-3.8 4.31z"></path></svg>

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
          <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google" className="header-logo logo-light"/>
          <svg className="header-logo logo-dark" height="30" viewBox="0 0 92 30" width="92" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M38.9 15.51c0 4.26-3.32 7.39-7.4 7.39s-7.4-3.14-7.4-7.39c0-4.28 3.32-7.39 7.4-7.39s7.4 3.1 7.4 7.39zm-3.24 0c0-2.66-1.93-4.48-4.16-4.48-2.23 0-4.16 1.82-4.16 4.48 0 2.63 1.93 4.48 4.16 4.48 2.23 0 4.16-1.85 4.16-4.48zm-23.7 7.47C5.63 22.98.31 17.83.31 11.5S5.63.02 11.96.02c3.5 0 5.99 1.37 7.87 3.16L17.62 5.4c-1.34-1.26-3.16-2.24-5.66-2.24-4.62 0-8.23 3.72-8.23 8.34 0 4.62 3.61 8.34 8.23 8.34 3 0 4.7-1.2 5.79-2.3.9-.9 1.49-2.2 1.74-4.17H12v-3.14h10.52c.11.56.17 1.23.17 1.96 0 2.35-.64 5.49-2.72 7.56-2.02 2.11-4.59 3.23-8.01 3.23zm42.94-7.47c0 4.26-3.32 7.39-7.4 7.39s-7.4-3.14-7.4-7.39c0-4.28 3.32-7.39 7.4-7.39s7.4 3.1 7.4 7.39zm-3.24 0c0-2.66-1.93-4.48-4.16-4.48-2.23 0-4.16 1.82-4.16 4.48 0 2.63 1.93 4.48 4.16 4.48 2.23 0 4.16-1.85 4.16-4.48zM70 8.56v13.27c0 5.46-3.05 7.7-6.86 7.7-3.58 0-5.74-2.41-6.55-4.37l2.83-1.18c.5 1.2 1.74 2.63 3.72 2.63 2.44 0 3.78-1.51 3.78-4.34v-1.06h-.11c-.73.9-2.04 1.68-3.81 1.68-3.7 0-7-3.22-7-7.36 0-4.17 3.3-7.42 7-7.42 1.76 0 3.08.78 3.81 1.65h.11v-1.2H70zm-2.86 6.97c0-2.6-1.74-4.51-3.95-4.51-2.24 0-3.95 1.9-3.95 4.51 0 2.58 1.71 4.45 3.95 4.45 2.22.01 3.95-1.87 3.95-4.45zM75 1.17V22.9h-3V1.17h3zm12.5 16.77l2.48 1.68c-.8 1.2-2.73 3.28-6.06 3.28-4.13 0-7.22-3.25-7.22-7.39 0-4.4 3.11-7.39 6.86-7.39 3.78 0 5.62 3.05 6.23 4.7l.31.85-9.71 4.08c.74 1.48 1.9 2.24 3.53 2.24s2.76-.82 3.58-2.05zm-7.63-2.66l6.5-2.74c-.36-.92-1.43-1.57-2.7-1.57-1.62 0-3.88 1.46-3.8 4.31z"></path></svg>

          <h1 className="room-title">{currentRoom.name}</h1>
          <div className="search-bar-container">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()} />
            <div className="search-bar-icons">
              <span className="camera-icon" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                <svg className="Gdd5U" focusable="false" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path fill="var(--bbQxAb)" d="M480-320q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm240 160q-33 0-56.5-23.5T640-240q0-33 23.5-56.5T720-320q33 0 56.5 23.5T800-240q0 33-23.5 56.5T720-160Zm-440 40q-66 0-113-47t-47-113v-80h80v80q0 33 23.5 56.5T280-200h200v80H280Zm480-320v-160q0-33-23.5-56.5T680-680H280q-33 0-56.5 23.5T200-600v120h-80v-120q0-66 47-113t113-47h80l40-80h160l40 80h80q66 0 113 47t47 113v160h-80Z"></path></svg>
              </span>
            </div>
          </div>
          <button className="search-button" onClick={sendTextMessage}>
            <span><svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg></span>
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
          <ThemeToggleButton />
          <AlertToggleButton />
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

                <div className="search-result-url">
                  https:// {msg.sender} › {formatTime(msg.createDateTime)} /{msg.uuid}... <span style={{fontSize: '20px'}}>⋮</span>
                </div>
                <h3 className="search-result-title">{msg.fakeTitle}</h3>
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

        {(!isWindowFocused.current && messageArrived && isModalAlert) && (
            <div id="coming-modal" className="modal-alert" onClick={closeModal}>
              <div className="modal-content">
                뭔가 왔습니다.
              </div>
            </div>
        )}
      </div>
  );
};

export default ChatApp;