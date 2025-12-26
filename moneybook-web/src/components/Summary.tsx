import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './Summary.css';

interface SummaryProps {
    userId: string;
}

function Summary({ userId }: SummaryProps) {
    const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

    useEffect(() => {
        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let income = 0;
            let expense = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.type === 'income') {
                    income += data.amount;
                } else {
                    expense += data.amount;
                }
            });

            setSummary({
                income,
                expense,
                balance: income - expense
            });
        });

        return () => unsubscribe();
    }, [userId]);

    return (
        <div className="summary">
            <div className="summary-item income">
                <h3>총 수입</h3>
                <p>+{summary.income.toLocaleString()}원</p>
            </div>
            <div className="summary-item expense">
                <h3>총 지출</h3>
                <p>-{summary.expense.toLocaleString()}원</p>
            </div>
            <div className="summary-item balance">
                <h3>잔액</h3>
                <p>{summary.balance.toLocaleString()}원</p>
            </div>
        </div>
    );
}

export default Summary;