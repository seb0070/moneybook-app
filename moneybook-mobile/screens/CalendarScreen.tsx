import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    Timestamp,
} from 'firebase/firestore';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    date: string;
    createdAt: any;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_WIDTH = (SCREEN_WIDTH - 60) / 7;

export default function CalendarScreen() {
    const user = auth.currentUser;
    const [currentDate, setCurrentDate] = useState(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [modalType, setModalType] = useState<'view' | 'add' | 'monthly' | null>(null);
    const [selectedStatType, setSelectedStatType] = useState<'income' | 'expense' | 'all'>('all');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());

    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('식비');
    const [description, setDescription] = useState('');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Transaction[];
            setTransactions(data);
        });
        return () => unsubscribe();
    }, [user]);

    const renderCalendar = () => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];
        let dayCounter = 1;
        const totalWeeks = Math.ceil((firstDay + daysInMonth) / 7);

        for (let week = 0; week < totalWeeks; week++) {
            const weekCells = [];

            for (let day = 0; day < 7; day++) {
                const cellIndex = week * 7 + day;

                if (cellIndex < firstDay || dayCounter > daysInMonth) {
                    weekCells.push(<View key={`empty-${week}-${day}`} style={styles.emptyCell} />);
                } else {
                    const currentDay = dayCounter;
                    const { income, expense } = getDailySummary(currentDay);

                    weekCells.push(
                        <TouchableOpacity
                            key={`day-${currentDay}`}
                            style={styles.calendarCell}
                            onPress={() => handleDateClick(currentDay)}
                        >
                            <View style={styles.dayContainer}>
                                <Text style={styles.dayNumber}>{currentDay}</Text>
                                {income > 0 && (
                                    <View style={styles.incomeTag}>
                                        <Text style={styles.tagText}>+{income.toLocaleString()}</Text>
                                    </View>
                                )}
                                {expense > 0 && (
                                    <View style={styles.expenseTag}>
                                        <Text style={styles.tagText}>-{expense.toLocaleString()}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    );

                    dayCounter++;
                }
            }

            cells.push(<View key={`week-${week}`} style={styles.calendarRow}>{weekCells}</View>);
        }

        return cells;
    };

    const getDailySummary = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTransactions = transactions.filter((t) => t.date === dateStr);
        let income = 0, expense = 0;
        dayTransactions.forEach((t) => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
        return { income, expense };
    };

    const getMonthlyStats = () => {
        const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;
        const monthTransactions = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);
        let income = 0, expense = 0;
        monthTransactions.forEach((t) => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
        return { income, expense, balance: income - expense };
    };

    const handleDateClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setModalType('view');
    };

    const handleFloatingBtnClick = () => {
        const today = new Date();
        setTempDate(today);
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setModalType('add');
    };

    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setTempDate(date);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            setSelectedDate(dateStr);
        }
    };

    const adjustAmount = (delta: number) => {
        const current = parseFloat(amount) || 0;
        const newAmount = Math.max(0, current + delta);
        setAmount(newAmount.toString());
    };

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0 || !selectedDate || !user) {
            Alert.alert('오류', '금액을 입력하세요');
            return;
        }
        try {
            await addDoc(collection(db, 'transactions'), {
                userId: user.uid, type, amount: parseFloat(amount), category, description, date: selectedDate, createdAt: Timestamp.now(),
            });
            setAmount(''); setDescription(''); setModalType('view');
            Alert.alert('성공', '등록되었습니다!');
        } catch (error) {
            Alert.alert('오류', '등록 실패');
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert('삭제', '삭제하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: async () => { try { await deleteDoc(doc(db, 'transactions', id)); } catch (error) {} }},
        ]);
    };

    const prevMonth = () => setCurrentDate(new Date(year, month - 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1));

    const stats = getMonthlyStats();
    const dateTransactions = selectedDate ? transactions.filter((t) => t.date === selectedDate) : [];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>💰 가계부</Text>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user?.displayName || '사용자'}</Text>
                    <TouchableOpacity style={styles.logoutBtn} onPress={() => auth.signOut()}>
                        <Text style={styles.logoutBtnText}>로그아웃</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.monthlyStats}>
                    <TouchableOpacity style={[styles.statCard, styles.incomeCard]} onPress={() => { setSelectedStatType('income'); setModalType('monthly'); }}>
                        <Text style={styles.statLabel}>수입</Text>
                        <Text style={[styles.statValue, styles.incomeText]}>+{stats.income.toLocaleString()}원</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statCard, styles.expenseCard]} onPress={() => { setSelectedStatType('expense'); setModalType('monthly'); }}>
                        <Text style={styles.statLabel}>지출</Text>
                        <Text style={[styles.statValue, styles.expenseText]}>-{stats.expense.toLocaleString()}원</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statCard, styles.balanceCard]} onPress={() => { setSelectedStatType('all'); setModalType('monthly'); }}>
                        <Text style={styles.statLabel}>잔액</Text>
                        <Text style={[styles.statValue, styles.balanceText]}>{stats.balance.toLocaleString()}원</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={prevMonth} style={styles.navBtn}><Text style={styles.navBtnText}>◀</Text></TouchableOpacity>
                    <Text style={styles.calendarTitle}>{year}년 {month + 1}월</Text>
                    <TouchableOpacity onPress={nextMonth} style={styles.navBtn}><Text style={styles.navBtnText}>▶</Text></TouchableOpacity>
                </View>

                <View style={styles.calendarRow}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <View key={day} style={styles.weekdayCell}>
                            <Text style={styles.weekday}>{day}</Text>
                        </View>
                    ))}
                </View>

                {renderCalendar()}
            </ScrollView>

            <TouchableOpacity style={styles.floatingBtn} onPress={handleFloatingBtnClick}>
                <Text style={styles.floatingBtnText}>+</Text>
            </TouchableOpacity>

            {modalType === 'view' && selectedDate && (
                <Modal visible={true} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectedDate} 내역</Text>
                                <TouchableOpacity onPress={() => setModalType(null)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
                            </View>
                            <ScrollView style={styles.transactionList}>
                                {dateTransactions.length === 0 ? <Text style={styles.emptyText}>내역이 없습니다</Text> :
                                    dateTransactions.map((t) => (
                                        <View key={t.id} style={styles.transactionItem}>
                                            <View>
                                                <Text style={styles.transactionCategory}>{t.category}</Text>
                                                <Text style={styles.transactionDesc}>{t.description}</Text>
                                            </View>
                                            <View style={styles.transactionRight}>
                                                <Text style={[styles.transactionAmount, t.type === 'income' ? styles.incomeText : styles.expenseText]}>
                                                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
                                                </Text>
                                                <TouchableOpacity onPress={() => handleDelete(t.id)}><Text style={styles.deleteBtn}>삭제</Text></TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                }
                            </ScrollView>
                            <TouchableOpacity style={styles.addBtn} onPress={() => setModalType('add')}>
                                <Text style={styles.addBtnText}>+ 새 거래 추가</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}

            {modalType === 'add' && selectedDate && (
                <Modal visible={true} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>거래 추가</Text>
                                <TouchableOpacity onPress={() => setModalType('view')}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
                            </View>
                            <ScrollView style={styles.formContainer}>

                                <Text style={styles.label}>날짜</Text>
                                <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                                    <Text style={styles.dateText}>{selectedDate}</Text>
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={tempDate}
                                        mode="date"
                                        display="default"
                                        onChange={handleDateChange}
                                    />
                                )}

                                <Text style={styles.label}>유형</Text>
                                <View style={styles.typeButtons}>
                                    <TouchableOpacity style={[styles.typeBtn, type === 'income' && styles.typeBtnActive]} onPress={() => setType('income')}>
                                        <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>수입</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]} onPress={() => setType('expense')}>
                                        <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>지출</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>금액</Text>
                                <View style={styles.amountContainer}>
                                    <TouchableOpacity style={styles.amountBtn} onPress={() => adjustAmount(-1000)}>
                                        <Text style={styles.amountBtnText}>▼</Text>
                                    </TouchableOpacity>
                                    <TextInput
                                        style={styles.amountInput}
                                        value={amount}
                                        onChangeText={setAmount}
                                        keyboardType="numeric"
                                        placeholder="금액"
                                    />
                                    <TouchableOpacity style={styles.amountBtn} onPress={() => adjustAmount(1000)}>
                                        <Text style={styles.amountBtnText}>▲</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>카테고리</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker}>
                                        {type === 'expense' ? (
                                            <>{['식비', '교통', '쇼핑', '기타'].map(c => <Picker.Item key={c} label={c} value={c} />)}</>
                                        ) : (
                                            <>{['급여', '용돈', '기타'].map(c => <Picker.Item key={c} label={c} value={c} />)}</>
                                        )}
                                    </Picker>
                                </View>

                                <Text style={styles.label}>메모</Text>
                                <TextInput
                                    style={[styles.input, styles.memoInput]}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="메모 (선택)"
                                    multiline
                                    numberOfLines={3}
                                />

                                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                                    <Text style={styles.submitBtnText}>등록하기</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}

            {modalType === 'monthly' && (
                <Modal visible={true} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{year}년 {month + 1}월 {selectedStatType === 'income' ? '수입' : selectedStatType === 'expense' ? '지출' : '전체'} 내역</Text>
                                <TouchableOpacity onPress={() => setModalType(null)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
                            </View>
                            <ScrollView style={styles.transactionList}>
                                {(() => {
                                    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                                    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;
                                    let monthTransactions = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);
                                    if (selectedStatType === 'income') monthTransactions = monthTransactions.filter(t => t.type === 'income');
                                    else if (selectedStatType === 'expense') monthTransactions = monthTransactions.filter(t => t.type === 'expense');
                                    monthTransactions = monthTransactions.sort((a, b) => b.date.localeCompare(a.date));
                                    if (monthTransactions.length === 0) return <Text style={styles.emptyText}>내역이 없습니다</Text>;
                                    return monthTransactions.map((t) => (
                                        <View key={t.id} style={styles.transactionItem}>
                                            <View>
                                                <Text style={styles.transactionCategory}>{t.date.split('-')[2]}일 · {t.category}</Text>
                                                <Text style={styles.transactionDesc}>{t.description}</Text>
                                            </View>
                                            <View style={styles.transactionRight}>
                                                <Text style={[styles.transactionAmount, t.type === 'income' ? styles.incomeText : styles.expenseText]}>
                                                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}원
                                                </Text>
                                                <TouchableOpacity onPress={() => handleDelete(t.id)}><Text style={styles.deleteBtn}>삭제</Text></TouchableOpacity>
                                            </View>
                                        </View>
                                    ));
                                })()}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    userName: { fontSize: 13, color: '#666' },
    logoutBtn: { backgroundColor: 'white', borderWidth: 2, borderColor: '#e0e0e0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    logoutBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
    scrollView: { flex: 1, padding: 12 },
    monthlyStats: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    statCard: { flex: 1, backgroundColor: 'white', padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
    incomeCard: { backgroundColor: '#f0fff4', borderColor: '#c3fad5' },
    expenseCard: { backgroundColor: '#fff5f5', borderColor: '#ffc9c9' },
    balanceCard: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' },
    statLabel: { fontSize: 9, color: '#666', fontWeight: '600', marginBottom: 2 },
    statValue: { fontSize: 14, fontWeight: '700' },
    incomeText: { color: '#2f9e44' },
    expenseText: { color: '#e03131' },
    balanceText: { color: '#0c8599' },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 10, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
    navBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e8e8e8', width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    navBtnText: { fontSize: 16, color: '#aaa' },
    calendarTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
    calendarRow: { flexDirection: 'row', gap: 5, marginBottom: 5 },
    weekdayCell: { width: CELL_WIDTH, alignItems: 'center', paddingVertical: 3 },
    weekday: { fontSize: 10, fontWeight: '700', color: '#666' },
    emptyCell: { width: CELL_WIDTH, height: 95 },
    calendarCell: { width: CELL_WIDTH, height: 95, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', overflow: 'hidden' },
    dayContainer: { flex: 1, padding: 8, justifyContent: 'space-between' },
    dayNumber: { fontSize: 12, fontWeight: '700', color: '#333' },
    incomeTag: { backgroundColor: '#d3f9d8', paddingVertical: 4, width: '100%' },
    expenseTag: { backgroundColor: '#ffe3e3', paddingVertical: 4, width: '100%' },
    tagText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
    floatingBtn: { position: 'absolute', bottom: 24, right: 24, width: 48, height: 48, backgroundColor: '#667eea', borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#667eea', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
    floatingBtnText: { fontSize: 24, color: 'white', fontWeight: '300' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    closeBtn: { fontSize: 24, color: '#999' },
    transactionList: { maxHeight: 400 },
    emptyText: { textAlign: 'center', color: '#aaa', padding: 20 },
    transactionItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    transactionCategory: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    transactionDesc: { fontSize: 12, color: '#666', marginTop: 2 },
    transactionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    transactionAmount: { fontSize: 14, fontWeight: 'bold' },
    deleteBtn: { fontSize: 11, color: '#ff6b6b', fontWeight: '600' },
    addBtn: { backgroundColor: '#667eea', padding: 14, borderRadius: 10, marginTop: 12 },
    addBtnText: { color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 15 },
    formContainer: { maxHeight: 400 },
    label: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 6 },
    dateInput: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, backgroundColor: 'white' },
    dateText: { fontSize: 14, color: '#333' },
    typeButtons: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    typeBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: 'white' },
    typeBtnActive: { backgroundColor: '#667eea', borderColor: '#667eea' },
    typeBtnText: { textAlign: 'center', color: '#666', fontWeight: '600' },
    typeBtnTextActive: { color: 'white' },
    amountContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    amountBtn: { backgroundColor: '#667eea', width: 40, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    amountBtnText: { fontSize: 16, color: 'white', fontWeight: 'bold' },
    amountInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, backgroundColor: 'white', fontSize: 14 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, backgroundColor: 'white', fontSize: 14 },
    memoInput: { height: 80, textAlignVertical: 'top' },
    pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: 'white', overflow: 'hidden' },
    picker: { height: 50 },
    submitBtn: { backgroundColor: '#667eea', padding: 14, borderRadius: 10, marginTop: 20, marginBottom: 8 },
    submitBtnText: { color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 15 },
});