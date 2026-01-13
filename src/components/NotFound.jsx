import React from 'react';
import { Modal, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFound = ({ isVisible, onClose }) => {
  const navigate = useNavigate();

  const handleClose = () => {
    if (onClose) onClose();
    navigate(-1);
  };

  // If isVisible is explicitly provided, render as a modal (backwards compatibility)
  if (typeof isVisible === 'boolean') {
    return (
      <Modal
        open={isVisible}
        onCancel={handleClose}
        footer={null}
        closable={true}
        maskClosable={false}
      >
        <Result
          status="404"
          title="404"
          subTitle="Sorry, the page you visited does not exist."
        />
      </Modal>
    );
  }

  // Default: render a full-page 404 for route-based usage
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      minHeight: '60vh'
    }}>
      <Result
        status="404"
        title="Page Not Found"
        subTitle="Sorry, the page you visited does not exist."
        extra={[
          <Button key="back" onClick={() => navigate(-1)}>Go Back</Button>
          
        ]}
      />
    </div>
  );
};

export default NotFound;