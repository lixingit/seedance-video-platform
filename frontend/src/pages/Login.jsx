/**
 * 登录页面（简单用户名输入）
 */
import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { setUsername, createUser } from '../services/api';

const { Title } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await createUser(values.username);
      setUsername(values.username);
      message.success(`欢迎，${values.username}！`);
      navigate('/generate');
    } catch (error) {
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            Seedance 视频生成平台
          </Title>
          <p style={{ color: '#666', margin: 0 }}>请输入用户名开始使用</p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              进入平台
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
