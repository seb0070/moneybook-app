import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import './Calendar.css';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    date: string;
    createdAt: any;
}

interface CalendarProps {
    userId: string;
}

function Calendar({ userId }: CalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // 모달 타입: 'view' (일별 보기), 'add' (새 거래 추가), 'monthly' (월별 보기), 'datePicker' (날짜 선택)
    const [modalType, setModalType] = useState<'view' | 'add' | 'monthly' | 'datePicker' | null>(null);
    const [selectedStatType, setSelectedStatType] = useState<'income' | 'expense' | 'all'>('all');

    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('식비');
    const [description, setDescription] = useState('');

    // 날짜 선택용 state
    const [tempYear, setTempYear] = useState(new Date().getFullYear());
    const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    useEffect(() => {
        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Transaction[];
            setTransactions(data);
        });

        return () => unsubscribe();
    }, [userId]);

    const getDaysInMonth = () => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    };

    const getTransactionsForDate = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return transactions.filter(t => t.date === dateStr);
    };

    const getDailySummary = (day: number) => {
        const dayTransactions = getTransactionsForDate(day);
        const income = dayTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = dayTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        return { income, expense };
    };

    const getMonthlyStats = () => {
        const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;

        const monthTransactions = transactions.filter(t =>
            t.date >= monthStart && t.date <= monthEnd
        );

        const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return { income, expense, balance: income - expense };
    };

    // 날짜 클릭 → 상세 내역 보기
    const handleDateClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setModalType('view');
    };

    // 플로팅 버튼 클릭 → 새 거래 추가
    const handleFloatingBtnClick = () => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setModalType('add');
        setAmount('');
        setDescription('');
    };

    // 상세 내역에서 새 거래 추가 버튼 클릭
    const handleAddFromDetail = () => {
        setModalType('add');
        setAmount('');
        setDescription('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0 || !selectedDate) {
            alert('금액을 입력하세요');
            return;
        }

        try {
            await addDoc(collection(db, 'transactions'), {
                userId,
                type,
                amount: parseFloat(amount),
                category,
                description,
                date: selectedDate,
                createdAt: Timestamp.now()
            });

            setAmount('');
            setDescription('');
            setModalType('view'); // 추가 후 상세 보기로 전환
            alert('등록되었습니다!');
        } catch (error) {
            console.error('Error:', error);
            alert('등록 실패');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('삭제하시겠습니까?')) {
            try {
                await deleteDoc(doc(db, 'transactions', id));
            } catch (error) {
                console.error('삭제 실패:', error);
            }
        }
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedDate(null);
    };

    const prevMonth = () => setCurrentDate(new Date(year, month - 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1));

    const days = getDaysInMonth();
    const stats = getMonthlyStats();

    return (
        <div className="calendar-container">
            {/* 월별 통계 */}
            <div className="monthly-stats">
                <div className="stat-card income" onClick={() => { setSelectedStatType('income'); setModalType('monthly'); }}>
                    <div className="stat-label">수입</div>
                    <div className="stat-value">+{stats.income.toLocaleString()}원</div>
                </div>
                <div className="stat-card expense" onClick={() => { setSelectedStatType('expense'); setModalType('monthly'); }}>
                    <div className="stat-label">지출</div>
                    <div className="stat-value">-{stats.expense.toLocaleString()}원</div>
                </div>
                <div className="stat-card balance" onClick={() => { setSelectedStatType('all'); setModalType('monthly'); }}>
                    <div className="stat-label">잔액</div>
                    <div className="stat-value">{stats.balance.toLocaleString()}원</div>
                </div>
            </div>

            {/* 캘린더 헤더 */}
            <div className="calendar-header">
                <button onClick={prevMonth} className="nav-btn">◀</button>
                <h2 onClick={() => { setTempYear(year); setTempMonth(month + 1); setModalType('datePicker'); }} style={{cursor: 'pointer'}}>
                    {year}년 {month + 1}월
                </h2>
                <button onClick={nextMonth} className="nav-btn">▶</button>
            </div>

            {/* 요일 */}
            <div className="weekdays">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                    <div key={day} className="weekday">{day}</div>
                ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="calendar-grid">
                {days.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="calendar-day empty"></div>;
                    }

                    const { income, expense } = getDailySummary(day);

                    return (
                        <div key={day} className="calendar-day" onClick={() => handleDateClick(day)}>
                            <div className="day-number">{day}</div>
                            <div className="day-summary">
                                {income > 0 && (
                                    <div className="summary-item income">
                                        +{income.toLocaleString()}
                                    </div>
                                )}
                                {expense > 0 && (
                                    <div className="summary-item expense">
                                        -{expense.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 플로팅 추가 버튼 */}
            <button className="floating-add-btn" onClick={handleFloatingBtnClick}>
                +
            </button>

            {/* 모달 - 상세 내역 보기 */}
            {modalType === 'view' && selectedDate && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedDate} 거래 내역</h3>
                            <button onClick={closeModal} className="close-btn">✕</button>
                        </div>

                        {/* 일일 총액 */}
                        {(() => {
                            const dayTransactions = getTransactionsForDate(parseInt(selectedDate.split('-')[2]));
                            const dailyIncome = dayTransactions
                                .filter(t => t.type === 'income')
                                .reduce((sum, t) => sum + t.amount, 0);
                            const dailyExpense = dayTransactions
                                .filter(t => t.type === 'expense')
                                .reduce((sum, t) => sum + t.amount, 0);

                            if (dailyIncome > 0 || dailyExpense > 0) {
                                return (
                                    <div className="day-total-summary">
                                        <div className="total-badge income">
                                            <div className="total-label">수입</div>
                                            <div className="total-amount">+{dailyIncome.toLocaleString()}원</div>
                                        </div>
                                        <div className="total-badge expense">
                                            <div className="total-label">지출</div>
                                            <div className="total-amount">-{dailyExpense.toLocaleString()}원</div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* 거래 목록 */}
                        <div className="existing-transactions">
                            {getTransactionsForDate(parseInt(selectedDate.split('-')[2])).length === 0 ? (
                                <div className="empty-state">등록된 거래가 없습니다</div>
                            ) : (
                                getTransactionsForDate(parseInt(selectedDate.split('-')[2])).map(t => (
                                    <div key={t.id} className="transaction-item">
                                        <div>
                                            <div className="transaction-category">{t.category}</div>
                                            <div className="transaction-desc">{t.description}</div>
                                        </div>
                                        <div className="transaction-right">
                      <span className={`transaction-amount ${t.type}`}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
                      </span>
                                            <button onClick={() => handleDelete(t.id)} className="delete-btn-small">삭제</button>
                                        </div>
                                    </div>
                                ))
                            )}

                            <button onClick={handleAddFromDetail} className="add-transaction-btn">
                                새 거래 추가
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 - 새 거래 추가 */}
            {modalType === 'add' && selectedDate && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedDate} 새 거래 추가</h3>
                            <button onClick={closeModal} className="close-btn">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="transaction-form-modal">
                            <div className="type-selector">
                                <button
                                    type="button"
                                    className={`type-btn ${type === 'income' ? 'active income' : ''}`}
                                    onClick={() => setType('income')}
                                >
                                    수입
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
                                    onClick={() => setType('expense')}
                                >
                                    지출
                                </button>
                            </div>

                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="금액"
                                className="modal-input"
                                step="1000"
                                min="0"
                                required
                            />

                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="modal-input"
                            >
                                {type === 'expense' ? (
                                    <>
                                        <option value="식비">식비</option>
                                        <option value="교통">교통</option>
                                        <option value="쇼핑">쇼핑</option>
                                        <option value="기타">기타</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="급여">급여</option>
                                        <option value="용돈">용돈</option>
                                        <option value="기타">기타</option>
                                    </>
                                )}
                            </select>

                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="메모 (선택)"
                                className="modal-input"
                            />

                            <button type="submit" className="submit-btn-modal">
                                추가하기
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 모달 - 월별 전체 내역 */}
            {modalType === 'monthly' && (
                <div className="modal-overlay" onClick={() => setModalType(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                {year}년 {month + 1}월
                                {selectedStatType === 'income' ? ' 수입 내역' :
                                    selectedStatType === 'expense' ? ' 지출 내역' :
                                        ' 전체 내역'}
                            </h3>
                            <button onClick={() => setModalType(null)} className="close-btn">✕</button>
                        </div>

                        {/* 월별 총액 */}
                        {selectedStatType === 'all' && (
                            <div className="day-total-summary">
                                <div className="total-badge income">
                                    <div className="total-label">총 수입</div>
                                    <div className="total-amount">+{stats.income.toLocaleString()}원</div>
                                </div>
                                <div className="total-badge expense">
                                    <div className="total-label">총 지출</div>
                                    <div className="total-amount">-{stats.expense.toLocaleString()}원</div>
                                </div>
                            </div>
                        )}

                        {selectedStatType === 'income' && (
                            <div className="day-total-summary">
                                <div className="total-badge income" style={{flex: 'none', width: '100%'}}>
                                    <div className="total-label">총 수입</div>
                                    <div className="total-amount">+{stats.income.toLocaleString()}원</div>
                                </div>
                            </div>
                        )}

                        {selectedStatType === 'expense' && (
                            <div className="day-total-summary">
                                <div className="total-badge expense" style={{flex: 'none', width: '100%'}}>
                                    <div className="total-label">총 지출</div>
                                    <div className="total-amount">-{stats.expense.toLocaleString()}원</div>
                                </div>
                            </div>
                        )}

                        {/* 월별 거래 목록 */}
                        <div className="existing-transactions">
                            {(() => {
                                const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                                const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;
                                let monthTransactions = transactions
                                    .filter(t => t.date >= monthStart && t.date <= monthEnd);

                                // 타입에 따라 필터링
                                if (selectedStatType === 'income') {
                                    monthTransactions = monthTransactions.filter(t => t.type === 'income');
                                } else if (selectedStatType === 'expense') {
                                    monthTransactions = monthTransactions.filter(t => t.type === 'expense');
                                }

                                monthTransactions = monthTransactions.sort((a, b) => b.date.localeCompare(a.date));

                                if (monthTransactions.length === 0) {
                                    return <div className="empty-state">
                                        {selectedStatType === 'income' ? '수입 내역이 없습니다' :
                                            selectedStatType === 'expense' ? '지출 내역이 없습니다' :
                                                '거래 내역이 없습니다'}
                                    </div>;
                                }

                                return monthTransactions.map(t => (
                                    <div key={t.id} className="transaction-item">
                                        <div>
                                            <div className="transaction-category">{t.date.split('-')[2]}일 · {t.category}</div>
                                            <div className="transaction-desc">{t.description}</div>
                                        </div>
                                        <div className="transaction-right">
                      <span className={`transaction-amount ${t.type}`}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
                      </span>
                                            <button onClick={() => handleDelete(t.id)} className="delete-btn-small">삭제</button>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* 모달 - 날짜 선택 */}
            {modalType === 'datePicker' && (
                <div className="modal-overlay" onClick={() => setModalType(null)}>
                    <div className="modal-content date-picker-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>날짜 이동</h3>
                            <button onClick={() => setModalType(null)} className="close-btn">✕</button>
                        </div>

                        <div className="date-picker-content">
                            <div className="date-picker-group">
                                <label className="date-picker-label">년도</label>
                                <select
                                    value={tempYear}
                                    onChange={(e) => setTempYear(parseInt(e.target.value))}
                                    className="date-picker-select"
                                >
                                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                                        <option key={y} value={y}>{y}년</option>
                                    ))}
                                </select>
                            </div>

                            <div className="date-picker-group">
                                <label className="date-picker-label">월</label>
                                <select
                                    value={tempMonth}
                                    onChange={(e) => setTempMonth(parseInt(e.target.value))}
                                    className="date-picker-select"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{m}월</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={() => {
                                    setCurrentDate(new Date(tempYear, tempMonth - 1));
                                    setModalType(null);
                                }}
                                className="date-picker-confirm-btn"
                            >
                                이동하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Calendar;