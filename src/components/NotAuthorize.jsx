import React from 'react';
import { Modal, Result, Button } from 'antd';

const NotAuthorize = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button 
          key="close" 
          type="primary" 
          onClick={onClose}
        >
          Close
        </Button>
      ]}
      closable={false}
      maskClosable={false}
    >
      <Result
        status="403"
        title="Not Authorized"
        subTitle="Sorry, you are not authorized to access this page."
      />
    </Modal>
  );
};

export default NotAuthorize;