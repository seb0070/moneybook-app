import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './TransactionForm.css';

interface TransactionFormProps {
    userId: string;
}

function TransactionForm({ userId }: TransactionFormProps) {
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('식비');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0) {
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
                createdAt: serverTimestamp()
            });

            setAmount('');
            setDescription('');
            alert('등록되었습니다!');
        } catch (error) {
            console.error('Error:', error);
            alert('등록 실패');
        }
    };

    return (
        <div className="transaction-form">
            <h2>거래 등록</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>유형</label>
                    <select value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')}>
                        <option value="income">수입</option>
                        <option value="expense">지출</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>금액</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="금액 입력"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>카테고리</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
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
                </div>

                <div className="form-group">
                    <label>메모</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="메모 (선택)"
                    />
                </div>

                <button type="submit" className="submit-btn">
                    등록하기
                </button>
            </form>
        </div>
    );
}

export default TransactionForm;