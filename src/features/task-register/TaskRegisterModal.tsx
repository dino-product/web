/**
 * 새 작업 등록 모달(Figma 1282:7973 미입력, 1325:8053 입력, 1834:13179 작업 유형 드롭다운 열림). 담당: timetable 섹션.
 * 사용처: 타임테이블 '새 작업 등록'·네트워크 실패 '작업 등록으로', 작업 목록 '새 작업 등록'.
 *
 * - 저장 활성: 작업명을 입력하면 활성(미입력 시안은 비활성, 입력 시안은 활성). 담당기사·시간은 비워도 대기함(등록)으로
 *   저장되고(디자이너 전달사항: 등록 = 담당기사·시간 중 하나라도 비어 대기함에 있는 작업), 작업 유형은 유형이 없는
 *   발주사에서도 등록할 수 있게 필수에서 뺐다.
 * - 저장: createTask. 시작 시간을 고르면 날짜는 TaskRegisterDateContext(타임테이블이 보고 있는 날짜, 없으면 오늘).
 *   기사·시작 시간·소요 시간이 모두 있으면 배정됨, 하나라도 없으면 등록(대기함).
 * - 주소 검색: 팝업 시안이 없어 샘플 주소를 채우는 동작만 한다(주소 검색 API 없음).
 */
import clsx from 'clsx';
import { type ChangeEvent, type ReactNode, useContext, useId, useRef, useState } from 'react';

import { Button, Field, Icon, Modal, ModalPanel, TextField } from '@/design-system';
import { today } from '@/lib/date';
import { formatNumber, formatPhone } from '@/lib/format';
import { MAX_SITE_PHOTOS, PAYMENT_METHODS } from '@/data/constants';
import { useActiveTechnicians, useActiveTypes } from '@/data/selectors';
import { useAppStore } from '@/data/store';
import type { TaskCustomer } from '@/data/types';

import { OptionSelect } from './OptionSelect';
import { TaskRegisterDateContext } from './registerDate';
import { DURATION_OPTIONS, START_TIME_OPTIONS, START_TIME_SCROLL_HINT } from './scheduleOptions';
import styles from './TaskRegisterModal.module.css';

export interface TaskRegisterModalProps {
  open: boolean;
  onClose: () => void;
  /** 저장 성공 시 새 작업 ID */
  onCreated?: (taskId: string) => void;
}

/** 주소 검색 버튼이 채우는 샘플 주소 */
const SAMPLE_ADDRESS = { zipCode: '06236', address: '서울시 강남구 테헤란로 152' } as const;

const PAYMENT_OPTIONS = PAYMENT_METHODS.map((method) => ({ value: method, label: method }));

interface FormState {
  title: string;
  workTypeId: string | null;
  technicianId: string | null;
  startTime: string | null;
  duration: string | null;
  customerName: string;
  customerPhone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  price: string;
  paymentMethod: string | null;
  photos: string[];
}

const EMPTY_FORM: FormState = {
  title: '',
  workTypeId: null,
  technicianId: null,
  startTime: null,
  duration: null,
  customerName: '',
  customerPhone: '',
  zipCode: '',
  address: '',
  addressDetail: '',
  price: '',
  paymentMethod: null,
  photos: [],
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function SectionTitle({ children, optional = false }: { children: ReactNode; optional?: boolean }) {
  return (
    <h3 className={clsx('t-body-m-semibold', styles.sectionTitle)}>
      {children}
      {optional && <span className={clsx('t-body-xs-medium', styles.optional)}>(선택)</span>}
    </h3>
  );
}

export default function TaskRegisterModal({ open, onClose, onCreated }: TaskRegisterModalProps) {
  const contextDate = useContext(TaskRegisterDateContext);
  const createTask = useAppStore((s) => s.createTask);
  const workTypes = useActiveTypes('WORK');
  const technicians = useActiveTechnicians();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [wasOpen, setWasOpen] = useState(open);
  const fileRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  // 열 때마다 빈 양식에서 시작한다(미입력 시안). 렌더 중에 맞춰 이전 입력값이 한 프레임도 보이지 않게 한다.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setForm(EMPTY_FORM);
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const canSave = form.title.trim().length > 0;

  const handlePhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'));
    event.target.value = '';
    if (!files.length) return;
    const room = MAX_SITE_PHOTOS - form.photos.length;
    const urls = await Promise.all(files.slice(0, Math.max(0, room)).map(readAsDataUrl));
    setForm((prev) => ({ ...prev, photos: [...prev.photos, ...urls].slice(0, MAX_SITE_PHOTOS) }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    const hasCustomer = [form.customerName, form.customerPhone, form.zipCode, form.address, form.addressDetail].some(
      (v) => v.trim() !== '',
    );
    const customer: TaskCustomer | null = hasCustomer
      ? {
          name: form.customerName.trim(),
          phone: form.customerPhone,
          zipCode: form.zipCode,
          address: form.address,
          addressDetail: form.addressDetail.trim(),
        }
      : null;
    const priceDigits = form.price.replace(/\D/g, '');
    const id = await createTask({
      title: form.title,
      workTypeId: form.workTypeId,
      technicianId: form.technicianId,
      date: form.startTime ? (contextDate ?? today()) : null,
      startTime: form.startTime,
      durationMinutes: form.duration ? Number(form.duration) : null,
      customer,
      price: priceDigits ? Number(priceDigits) : null,
      paymentMethod: form.paymentMethod,
      sitePhotoUrls: form.photos,
    });
    // 등록에 실패하면(서버 오류) 입력값을 지우지 않도록 모달을 닫지 않는다. 오류 코드는 콘솔에 남는다.
    if (!id) return;
    onCreated?.(id);
    onClose();
  };

  const photoSlots = MAX_SITE_PHOTOS - (form.photos.length < MAX_SITE_PHOTOS ? 1 : 0) - form.photos.length;

  return (
    <Modal open={open} onClose={onClose} aria-label="새 작업 등록">
      <ModalPanel title="새 작업 등록" className={styles.panel} bodyClassName={styles.body}>
        <div className={styles.column}>
          {/* 기본 정보 1325:5513 */}
          <section className={styles.card}>
            <SectionTitle>기본 정보</SectionTitle>
            <div className={styles.fields}>
              <Field label="작업명" htmlFor={`${uid}-title`}>
                <TextField
                  id={`${uid}-title`}
                  placeholder="예) 배관 누수 점검 및 교체"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </Field>
              <div className={styles.row}>
                <Field label="작업 유형" htmlFor={`${uid}-type`}>
                  <OptionSelect
                    id={`${uid}-type`}
                    value={form.workTypeId}
                    options={workTypes.map((t) => ({ value: t.id, label: t.name }))}
                    onChange={(v) => set('workTypeId', v)}
                    placeholder="작업 유형 선택"
                  />
                </Field>
                <Field label="담당기사" htmlFor={`${uid}-tech`}>
                  <OptionSelect
                    id={`${uid}-tech`}
                    value={form.technicianId}
                    options={technicians.map((m) => ({ value: m.id, label: m.name }))}
                    onChange={(v) => set('technicianId', v)}
                    placeholder="담당 기사 선택"
                  />
                </Field>
              </div>
              <div className={styles.row}>
                <Field label="시작 시간" htmlFor={`${uid}-start`}>
                  <OptionSelect
                    id={`${uid}-start`}
                    value={form.startTime}
                    options={START_TIME_OPTIONS}
                    onChange={(v) => set('startTime', v)}
                    placeholder="시간 선택"
                    scrollHint={START_TIME_SCROLL_HINT}
                  />
                </Field>
                <Field label="예상 소요 시간" htmlFor={`${uid}-duration`}>
                  <OptionSelect
                    id={`${uid}-duration`}
                    value={form.duration}
                    options={DURATION_OPTIONS}
                    onChange={(v) => set('duration', v)}
                    placeholder="소요 시간 선택"
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* 고객 정보 1325:5398 */}
          <section className={styles.card}>
            <SectionTitle optional>고객 정보 </SectionTitle>
            <div className={styles.fields}>
              <div className={styles.row}>
                <Field label="고객명" htmlFor={`${uid}-customer`}>
                  <TextField
                    id={`${uid}-customer`}
                    placeholder="고객 이름"
                    value={form.customerName}
                    onChange={(e) => set('customerName', e.target.value)}
                  />
                </Field>
                <Field label="연락처" htmlFor={`${uid}-phone`}>
                  <TextField
                    id={`${uid}-phone`}
                    inputMode="tel"
                    placeholder="010-0000-0000"
                    value={form.customerPhone}
                    onChange={(e) => set('customerPhone', formatPhone(e.target.value))}
                  />
                </Field>
              </div>
              <Field label="주소" htmlFor={`${uid}-zip`}>
                <div className={styles.addressRow}>
                  <TextField
                    id={`${uid}-zip`}
                    className={styles.zip}
                    readOnly
                    placeholder="우편번호"
                    value={form.zipCode}
                  />
                  <Button
                    variant="outline"
                    icon="search"
                    style={{ borderRadius: 8 }}
                    onClick={() => setForm((prev) => ({ ...prev, ...SAMPLE_ADDRESS }))}
                  >
                    주소 검색
                  </Button>
                </div>
                <TextField readOnly placeholder="기본 주소" value={form.address} aria-label="기본 주소" />
                <TextField
                  placeholder="상세 주소를 입력하세요"
                  value={form.addressDetail}
                  aria-label="상세 주소"
                  onChange={(e) => set('addressDetail', e.target.value)}
                />
              </Field>
            </div>
          </section>
        </div>

        <div className={clsx(styles.column, styles.rightColumn)}>
          <div className={styles.rightCards}>
            {/* 요금 정보 1325:5574 */}
            <section className={styles.card}>
              <SectionTitle optional>요금 정보 </SectionTitle>
              <div className={styles.fields}>
                <div className={styles.row}>
                  <Field label="작업 금액" htmlFor={`${uid}-price`}>
                    <TextField
                      id={`${uid}-price`}
                      inputMode="numeric"
                      placeholder="0"
                      suffix="원"
                      value={form.price}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                        set('price', digits ? formatNumber(Number(digits)) : '');
                      }}
                    />
                  </Field>
                  <Field label="결제 방식" htmlFor={`${uid}-payment`}>
                    <OptionSelect
                      id={`${uid}-payment`}
                      value={form.paymentMethod}
                      options={PAYMENT_OPTIONS}
                      onChange={(v) => set('paymentMethod', v)}
                      placeholder="결제 방식 선택"
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* 현장 사진 1325:5606 — 사진 첨부 칸 + 미리보기 + 빈 칸, 최대 6장 */}
            <section className={styles.card}>
              <div className={styles.photoHeader}>
                <SectionTitle optional>현장 사진 </SectionTitle>
                <p className={clsx('t-caption-m-medium', styles.caption)}>이미지를 첨부하세요 (최대 6장)</p>
              </div>
              <div className={styles.photoGrid}>
                {form.photos.length < MAX_SITE_PHOTOS && (
                  <button type="button" className={styles.addPhoto} onClick={() => fileRef.current?.click()}>
                    <Icon name="plus" size={40} color="var(--color-gray-800)" />
                    <span className="t-caption-m-medium">사진 첨부</span>
                  </button>
                )}
                {form.photos.map((url, index) => (
                  <img key={`${index}-${url.length}`} className={styles.photo} src={url} alt={`현장 사진 ${index + 1}`} />
                ))}
                {Array.from({ length: photoSlots }, (_, index) => (
                  <span key={`slot-${index}`} className={styles.photoSlot}>
                    <Icon name="image" />
                  </span>
                ))}
              </div>
              <input
                ref={fileRef}
                className={styles.fileInput}
                type="file"
                accept="image/*"
                multiple
                tabIndex={-1}
                aria-hidden
                onChange={handlePhotos}
              />
            </section>
          </div>

          <div className={styles.actions}>
            <Button size="lg" variant="secondary" style={{ width: 97 }} onClick={onClose}>
              취소
            </Button>
            <Button size="lg" style={{ width: 173 }} disabled={!canSave} onClick={handleSave}>
              저장
            </Button>
          </div>
        </div>
      </ModalPanel>
    </Modal>
  );
}
