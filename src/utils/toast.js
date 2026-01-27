import { message } from 'antd';

export const toast = {
  success: (content) => message.success({ content }),
  error: (content) => message.error({ content }),
  info: (content) => message.info({ content }),
  warning: (content) => message.warning({ content })
};
