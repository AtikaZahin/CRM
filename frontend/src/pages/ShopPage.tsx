import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
}

const ShopPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, token } = useCustomerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        setProducts(res.data);
      } catch (err) {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleBook = async (productId: number) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to book products');
      navigate('/shop/login');
      return;
    }

    const qtyStr = window.prompt("Enter quantity to book:", "1");
    if (!qtyStr) return;
    
    const quantity = parseInt(qtyStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Invalid quantity');
      return;
    }

    try {
      await api.post('/orders', { product_id: productId, quantity }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order placed successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to place order');
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Shop</h1>
        <p className="auth-subtitle">Browse and book our services</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
        {products.map(p => (
          <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 24, flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{p.name}</h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, lineHeight: 1.5 }}>{p.description}</p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>${p.price.toFixed(2)}</span>
              <button onClick={() => handleBook(p.id)} className="btn btn-primary btn-sm">
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopPage;
