/**
 * 视频生成页面
 */
import React, { useState } from 'react';
import {
  Layout,
  Form,
  Input,
  Select,
  Button,
  Card,
  Typography,
  Row,
  Col,
  Collapse,
  message,
  Divider,
} from 'antd';
import {
  VideoCameraOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { createVideoTask, getUsername } from '../services/api';
import FrameUpload from '../components/FrameUpload';
import ImageGenerateModal from '../components/ImageGenerateModal';
import AssetPickerModal from '../components/AssetPickerModal';

const { Content, Header } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

// 预设提示词模板
const PROMPT_TEMPLATES = [
  {
    label: '产品展示',
    value: '[产品]在[场景]中，[运动方式]，[光线/氛围]',
  },
  {
    label: '人物动作',
    value: '[人物描述]正在[动作]，[服装/表情]，[背景]',
  },
  {
    label: '风景空镜',
    value: '[场景]的[时间/天气]，[运动方式]，[景别]',
  },
  {
    label: '抽象概念',
    value: '[风格]风格的[主体]，[色彩基调]，[氛围感]',
  },
];

const Generate = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const username = getUsername();

  const location = useLocation();

  // 从素材库跳转过来时，填入帧图片
  React.useEffect(() => {
    if (location.state?.firstFrameUrl) {
      setFirstFrameUrl(location.state.firstFrameUrl);
    }
    if (location.state?.lastFrameUrl) {
      setLastFrameUrl(location.state.lastFrameUrl);
    }
  }, [location.state]);

  const [firstFrameUrl, setFirstFrameUrl] = useState(null);
  const [lastFrameUrl, setLastFrameUrl] = useState(null);
  const [imageGenModalVisible, setImageGenModalVisible] = useState(false);
  const [assetPickerVisible, setAssetPickerVisible] = useState(false);
  const [activeFrameTarget, setActiveFrameTarget] = useState(null); // 'first' or 'last'

  const handleTemplateSelect = (template) => {
    form.setFieldsValue({ prompt: template });
  };

  const openAIGenerate = (target) => {
    setActiveFrameTarget(target);
    setImageGenModalVisible(true);
  };

  const openAssetPicker = (target) => {
    setActiveFrameTarget(target);
    setAssetPickerVisible(true);
  };

  const handleImageSelected = (url) => {
    if (activeFrameTarget === 'first') {
      setFirstFrameUrl(url);
    } else {
      setLastFrameUrl(url);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const task = await createVideoTask({
        ...values,
        first_frame_image_url: firstFrameUrl,
        last_frame_image_url: lastFrameUrl,
      });
      message.success('视频任务创建成功！');
      navigate('/history');
    } catch (error) {
      message.error(error.response?.data?.detail || '创建任务失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <VideoCameraOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 12 }} />
          <Title level={4} style={{ margin: 0 }}>Seedance 视频生成平台</Title>
        </div>
        <Text>当前用户：{username}</Text>
      </Header>

      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <Row gutter={24}>
          <Col xs={24} md={16}>
            <Card title="视频生成" style={{ marginBottom: 16 }}>
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                  duration: 4,
                  motion_intensity: 'standard',
                }}
              >
                {/* 预设模板 */}
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ marginRight: 12 }}>预设模板：</Text>
                  {PROMPT_TEMPLATES.map((tpl) => (
                    <Button
                      key={tpl.label}
                      type="link"
                      size="small"
                      onClick={() => handleTemplateSelect(tpl.value)}
                    >
                      {tpl.label}
                    </Button>
                  ))}
                </div>

                {/* 提示词输入 */}
                <Form.Item
                  name="prompt"
                  label="提示词"
                  rules={[{ required: true, message: '请输入提示词' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder="请描述你想要生成的视频内容..."
                    showCount
                    maxLength={500}
                  />
                </Form.Item>

                {/* 首帧/尾帧图片 */}
                <Divider style={{ margin: '16px 0' }}>帧图片（可选）</Divider>
                <Row gutter={16}>
                  <Col span={12}>
                    <FrameUpload
                      label="首帧图片（可选）"
                      value={firstFrameUrl}
                      onChange={setFirstFrameUrl}
                      onPickFromLibrary={() => openAssetPicker('first')}
                      onAIGenerate={() => openAIGenerate('first')}
                    />
                  </Col>
                  <Col span={12}>
                    <FrameUpload
                      label="尾帧图片（可选）"
                      value={lastFrameUrl}
                      onChange={setLastFrameUrl}
                      onPickFromLibrary={() => openAssetPicker('last')}
                      onAIGenerate={() => openAIGenerate('last')}
                    />
                  </Col>
                </Row>

                {/* 高级选项 */}
                <Collapse ghost>
                  <Panel header="高级选项" key="advanced">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="negative_prompt" label="负向提示词">
                          <TextArea
                            rows={2}
                            placeholder="描述不想在视频中出现的内容..."
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Panel>
                </Collapse>

                <Divider style={{ margin: '16px 0' }} />

                {/* 参数设置 */}
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="duration" label="视频时长">
                      <Select>
                        <Option value={3}>3 秒</Option>
                        <Option value={4}>4 秒</Option>
                        <Option value={5}>5 秒</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="motion_intensity" label="运动强度">
                      <Select>
                        <Option value="gentle">柔和</Option>
                        <Option value="standard">标准</Option>
                        <Option value="intense">剧烈</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item style={{ marginTop: 24 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    icon={<ThunderboltOutlined />}
                  >
                    生成视频
                  </Button>
                  <Button
                    style={{ marginLeft: 12 }}
                    size="large"
                    onClick={() => navigate('/history')}
                  >
                    查看历史
                  </Button>
                  <Button
                    style={{ marginLeft: 12 }}
                    size="large"
                    onClick={() => navigate('/assets')}
                  >
                    素材库
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card title="使用提示" style={{ marginBottom: 16 }}>
              <ul>
                <li style={{ marginBottom: 8 }}>尽可能详细地描述场景、动作、光线等</li>
                <li style={{ marginBottom: 8 }}>可以使用预设模板快速开始</li>
                <li style={{ marginBottom: 8 }}>视频生成需要约 1-2 分钟，请耐心等待</li>
                <li>在历史记录中可以查看所有生成的视频</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Content>

      {/* AI 图片生成弹窗 */}
      <ImageGenerateModal
        open={imageGenModalVisible}
        onCancel={() => setImageGenModalVisible(false)}
        onSelect={handleImageSelected}
        initialPrompt={form.getFieldValue('prompt') || ''}
      />

      {/* 素材库选图弹窗 */}
      <AssetPickerModal
        open={assetPickerVisible}
        onCancel={() => setAssetPickerVisible(false)}
        onSelect={handleImageSelected}
      />
    </Layout>
  );
};

export default Generate;
