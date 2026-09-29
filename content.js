/* 게임에 보이는 문구는 이 파일에서 수정하세요. {n}은 자동으로 숫자로 바뀝니다. */
window.GAME_CONTENT = {
  title: '부산에서 생긴일.', subtitle: '프로포즈편', edition: 'BUSAN · BONUS GAME',
  start: '시작', continue: '이어하기', reset: '처음부터 다시',
  resetQuestion: '모은 조각을 지우고\n처음부터 시작할까?', yes: '다시 시작', no: '돌아가기',
  mute: '소리 끔', unmute: '소리 켬', progress: '조각 {n}/4',
  stages: ['밤바다', '항구길', '기차 안', '신혼집'],
  opening: ['숨겨진 보상이 있습니다.', '조각 4개를 모으세요.'],
  sea: {
    start: '다은이에게 가 보자.',
    greeting: '다은: 귀문이 하이. 사실 선물이 하나 더 이찌롱.',
    clue: '다은: 첫 번째 조각은 여기 어딘가에 있어.',
    beforeTalk: '먼저 다은이와 이야기해 보자.', shells: ['빈 조개다.', '여기도 아니다.', '찾았다!'],
    exitLocked: '조개 속 조각을 찾아보자.', exit: '항구길로 가자!', found: '이미 살펴본 조개다.'
  },
  harbor: {start:'상자를 열려면 코인 3개가 필요하다.', coin:'코인 {n}/3', missing:'코인이 부족하다.', open:'상자가 열렸다!', exit:'기차가 기다리고 있다.', retry:'다시 점프! 코인은 그대로야.', hint:'오른쪽 끝으로!  코인 3개 → 상자 → 기차역', direction:'기차역  ▶', locked:'먼저 선물 상자를 열어보자.'},
  train: {start:'다은이를 좋아하는 마음만큼 숫자를 맞춰봐!', instruction:'표시 구간에 왔을 때 A를 누르자!', label:'다은이를 좋아하는 마음', success:['사랑꾼이다! 1/2','아싸! 2/2'], fail:'어쭈? 다시!', complete:'경품이 나왔다!', next:'다음 역: 신혼집', target:'100%', begin:'도전하기', attempts:'성공 {n}/2', assist:'조금 더 천천히. 다시 도전!'},
  home: {start:'마지막 조각을 찾아보자.', sofa:['문석이는 소파를 좋아한다.'], fridge:['우리 집 필수품은 계란, 낫또, 날치알이다.'], table:['결혼 후 다은이의 꿈은 요리사다.','맛없어도 먹어야 함.'], desk:['아직 아무것도 없다.','여기에 뭘 올려놓으면 좋을까?'], drawer:['열쇠를 찾았다!'], drawerEmpty:['서랍은 비어 있다.'], locked:['잠겨 있다. 열쇠가 필요하다.'], open:['상자가 열렸다!'], key:'열쇠 보유'},
  acquired:'조각 획득! {n}/4', allPieces:'조각 4개를 모두 모았다!',
  puzzle: {start:'퍼즐 맞추기', instruction:'조각 선택 → 놓을 칸 선택', hint:'튀어나온 모양을 칸에 맞춰보자.', wrong:'모양이 맞지 않는다. 다시!', correct:'딱 맞는다!', piece:'조각 {n}', slot:'퍼즐 칸 {n}', count:'배치 {n}/4', selected:'선택한 조각을 칸에 놓자.'},
  rewardTitle:'HIDDEN REWARD 발견!', rewardName:'고오-급 맞춤 컴퓨터', claim:'보상 받기', ending:'실물 보상은 옆에 있는 다은이에게!', endingLine:'다은: 행복하게 잘 살자.', endLabel:'HAPPY END',
  general: {explore:'방향키로 이동 · 가까이 가면 자동 조사', next:'대화창 / A 다음', interact:'자동 조사', talk:'자동 대화', jump:'점프', timing:'타이밍!', walk:'이동', saved:'자동 저장', noTarget:'조금 더 가까이 가 보자.', storageError:'저장이 꺼져 있어요. 이 창에서 계속 플레이해 주세요.', acquiredHint:'앞면은 아직 비밀.', continueHint:'이어서 모험을 시작하자.', loading:'조각을 뒤집는 중…'},
  names:{daeun:'다은', munseok:'문석', shell:'조개', exit:'가는 길', chest:'선물 상자', desk:'빈 책상',sofa:'소파',fridge:'냉장고',table:'탁자',drawer:'서랍',box:'이삿짐 상자'},
  accessibility:{scene:'문석이의 픽셀 모험', reward:'본체, 모니터, 키보드, 마우스로 구성된 픽셀 컴퓨터 세트'}
};
