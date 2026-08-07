import React from 'react';
import DealPipelineBoard from '../components/DealPipelineBoard';

const DealsPage = () => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Deals Pipeline</h1>
        <button className="btn-primary">+ New Deal</button>
      </div>
      
      <DealPipelineBoard />
    </div>
  );
};

export default DealsPage;
