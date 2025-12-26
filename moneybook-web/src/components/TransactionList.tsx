import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import './TransactionList.css';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    createdAt: any;
}

interface TransactionListProps {
    userId: string;
}

function TransactionList({ userId }: TransactionListProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
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

    const handleDelete = async (id: string) => {
        if (window.confirm('삭제하시겠습니까?')) {
            try {
                await deleteDoc(doc(db, 'transactions', id));
            } catch (error) {
                console.error('삭제 실패:', error);
            }
        }
    };

    return (
        <div className="transaction-list">
            <h2>거래 내역</h2>
            {transactions.length === 0 ? (
                <p className="empty-message">거래 내역이 없습니다.</p>
            ) : (
                <ul>
                    {transactions.map(transaction => (
                        <li key={transaction.id} className={`transaction-item ${transaction.type}`}>
                            <div className="transaction-info">
                                <span className="category">{transaction.category}</span>
                                <span className="description">{transaction.description}</span>
                            </div>
                            <div className="transaction-amount">
                <span className={transaction.type === 'income' ? 'income' : 'expense'}>
                  {transaction.type === 'income' ? '+' : '-'}
                    {transaction.amount.toLocaleString()}원
                </span>
                                <button onClick={() => handleDelete(transaction.id)} className="delete-btn">
                                    삭제
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default TransactionList;