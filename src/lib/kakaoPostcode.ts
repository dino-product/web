/**
 * 카카오 우편번호 서비스(https://postcode.map.kakao.com/guide). 키·사용량 제한 없이 브라우저에서 바로 부른다.
 * 스크립트는 처음 쓸 때 한 번만 넣는다. 배포 CSP(infra modules/web-site)에 script-src https://t1.kakaocdn.net과
 * frame-src https://postcode.map.kakao.com이 있어야 한다. 팝업 창(about:blank)도 이 페이지의 CSP를 물려받아
 * 그 안의 검색 화면 iframe이 frame-src에 걸린다.
 */
const SCRIPT_URL = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

/** 같은 팝업 창을 다시 쓴다(여러 번 눌러도 창 하나) */
const POPUP_KEY = 'orbit-postcode';

/** 고른 주소. zipCode는 5자리 우편번호(국가기초구역번호) */
export interface PostcodeAddress {
  zipCode: string;
  address: string;
}

/** oncomplete 결과 중 쓰는 항목. 사용자가 고른 쪽(R 도로명, J 지번)이 비면 auto* 값을 쓴다 */
interface PostcodeData {
  zonecode: string;
  userSelectedType: 'R' | 'J';
  roadAddress: string;
  autoRoadAddress: string;
  jibunAddress: string;
  autoJibunAddress: string;
}

interface PostcodeConstructor {
  new (options: { oncomplete: (data: PostcodeData) => void }): { open: (options?: { popupKey?: string }) => void };
}

declare global {
  interface Window {
    kakao?: { Postcode?: PostcodeConstructor };
  }
}

let loaded: PostcodeConstructor | null = null;
let loading: Promise<PostcodeConstructor> | null = null;

/** 스크립트를 미리 받아 둔다. 실패하면 다음 호출이 다시 받는다 */
export function loadPostcode(): Promise<PostcodeConstructor> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= new Promise<PostcodeConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const Postcode = window.kakao?.Postcode;
      if (Postcode) {
        loaded = Postcode;
        resolve(Postcode);
      } else {
        script.remove();
        reject(new Error('kakao.Postcode가 없습니다.'));
      }
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`스크립트를 불러오지 못했습니다: ${SCRIPT_URL}`));
    };
    document.head.append(script);
  }).finally(() => {
    loading = null;
  });
  return loading;
}

function pickAddress(data: PostcodeData): string {
  return data.userSelectedType === 'R'
    ? data.roadAddress || data.autoRoadAddress
    : data.jibunAddress || data.autoJibunAddress;
}

/**
 * 주소 검색 팝업을 연다. 스크립트를 받아 두었으면 클릭 처리 안에서 바로 열어 팝업 차단을 피하고,
 * 아직이면 받은 뒤 연다. 스크립트를 못 받으면 거부된 Promise를 돌려준다.
 */
export function openPostcodeSearch(onSelect: (address: PostcodeAddress) => void): Promise<void> {
  const show = (Postcode: PostcodeConstructor) =>
    new Postcode({ oncomplete: (data) => onSelect({ zipCode: data.zonecode, address: pickAddress(data) }) }).open({
      popupKey: POPUP_KEY,
    });
  if (loaded) {
    show(loaded);
    return Promise.resolve();
  }
  return loadPostcode().then(show);
}
