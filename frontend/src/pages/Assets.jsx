/**
 * 素材库页面
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Card,
  Typography,
  Tabs,
  Input,
  Select,
  Button,
  Row,
  Col,
  Tag,
  Modal,
  Form,
  message,
  Spin,
  Empty,
  Popconfirm,
  Pagination,
  Upload,
  Image,
} from 'antd';
import {
  VideoCameraOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
  ShareAltOutlined,
  FileTextOutlined,
  PictureOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  listAssets,
  updateAsset,
  deleteAsset,
  uploadImage,
  createPromptTemplate,
  getUsername,
} from '../services/api';

const { Content, Header } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const PRESET_TAGS = ['成片可用', '测试', '需优化', '参考案例', '产品素材', '空镜'];

const Assets = () => {
  const [scope, setScope] = useState('my');
  const [typeFilter, setTypeFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 编辑弹窗
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editForm] = Form.useForm();

  // 详情弹窗
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // 提示词模板弹窗
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateForm] = Form.useForm();

  const username = getUsername();
  const navigate = useNavigate();

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAssets({
        scope,
        type: typeFilter,
        keyword,
        page,
        page_size: pageSize,
      });
      setAssets(data.items || []);
      setTotal(data.total || 0);
    } catch {
      message.error('加载素材列表失败');
    } finally {
      setLoading(false);
    }
  }, [scope, typeFilter, keyword, page, pageSize]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleUpload = async (file) => {
    try {
      await uploadImage(file);
      message.success('上传成功');
      loadAssets();
    } catch {
      message.error('上传失败');
    }
    return false;
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    editForm.setFieldsValue({
      name: asset.name,
      description: asset.description,
      tags: asset.tags_list || [],
      is_shared: asset.is_shared,
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      await updateAsset(editingAsset.id, values);
      message.success('素材已更新');
      setEditModalVisible(false);
      loadAssets();
    } catch {
      message.error('更新失败');
    }
  };

  const handleDelete = async (assetId) => {
    try {
      await deleteAsset(assetId);
      message.success('素材已删除');
      loadAssets();
    } catch {
      message.error('删除失败');
    }
  };

  const handleToggleShare = async (asset) => {
    try {
      await updateAsset(asset.id, { is_shared: !asset.is_shared });
      message.success(asset.is_shared ? '已取消共享' : '已共享给团队');
      loadAssets();
    } catch {
      message.error('操作失败');
    }
  };

  const handleViewDetail = (asset) => {
    setSelectedAsset(asset);
    setDetailModalVisible(true);
  };

  const handleSaveTemplate = async () => {
    try {
      const values = await templateForm.validateFields();
      await createPromptTemplate(values);
      message.success('模板已保存');
      setTemplateModalVisible(false);
      templateForm.resetFields();
      loadAssets();
    } catch {
      message.error('保存失败');
    }
  };

  const handleUseAsFrame = (asset, frameType) => {
    navigate('/generate', { state: { [`${frameType}FrameUrl`]: asset.file_url } });
  };

  const renderAssetCard = (asset) => {
    return (
      <Col xs={12} sm={8} md={6} key={asset.id}>
        <Card
          hoverable
          size="small"
          style={{ marginBottom: 12 }}
          cover={
            asset.type === 'image' ? (
              <div style={{ height: 140, overflow: 'hidden', cursor: 'pointer' }} onClick={() => handleViewDetail(asset)}>
                <Image
                  src={asset.file_url}
                  width="100%"
                  height={140}
                  style={{ objectFit: 'cover' }}
                  preview={false}
                />
              </div>
            ) : asset.type === 'video' ? (
              <div
                style={{ height: 140, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => handleViewDetail(asset)}
              >
                <PlayCircleOutlined style={{ fontSize: 40, color: '#fff' }} />
              </div>
            ) : (
              <div
                style={{ height: 140, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => handleViewDetail(asset)}
              >
                <FileTextOutlined style={{ fontSize: 40, color: '#999' }} />
              </div>
            )
          }
          actions={
            scope === 'my' ? [
              <EditOutlined key="edit" onClick={() => handleEdit(asset)} />,
              <ShareAltOutlined
                key="share"
                style={{ color: asset.is_shared ? '#1890ff' : undefined }}
                onClick={() => handleToggleShare(asset)}
              />,
              <Popconfirm title="确定删除？" onConfirm={() => handleDelete(asset.id)} okText="确定" cancelText="取消">
                <DeleteOutlined key="delete" />
              </Popconfirm>,
            ] : []
          }
        >
          <Card.Meta
            title={
              <Text ellipsis style={{ fontSize: 13 }}>
                {asset.name || '未命名'}
              </Text>
            }
            description={
              <div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  {dayjs(asset.created_at).format('MM-DD HH:mm')}
                  {asset.is_shared && <Tag color="blue" style={{ marginLeft: 4, fontSize: 10 }}>共享</Tag>}
                </div>
                {(asset.tags_list || []).length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {asset.tags_list.slice(0, 3).map(t => <Tag key={t} style={{ fontSize: 10 }}>{t}</Tag>)}
                  </div>
                )}
              </div>
            }
          />
        </Card>
      </Col>
    );
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
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/generate')} />
          <PictureOutlined style={{ fontSize: 24, color: '#1890ff', margin: '0 12px' }} />
          <Title level={4} style={{ margin: 0 }}>素材库</Title>
        </div>
        <Text>当前用户：{username}</Text>
      </Header>

      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Tabs
                activeKey={scope}
                onChange={(key) => { setScope(key); setPage(1); }}
                items={[
                  { key: 'my', label: '我的素材' },
                  { key: 'shared', label: '团队共享' },
                ]}
              />
              <Select
                value={typeFilter}
                onChange={(v) => { setTypeFilter(v); setPage(1); }}
                style={{ width: 140 }}
                options={[
                  { value: '', label: '全部类型' },
                  { value: 'image', label: '图片' },
                  { value: 'video', label: '视频' },
                  { value: 'prompt_template', label: '提示词模板' },
                ]}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Search
                placeholder="搜索素材"
                style={{ width: 200 }}
                onSearch={(v) => { setKeyword(v); setPage(1); }}
                allowClear
              />
              <Upload accept="image/*" showUploadList={false} beforeUpload={handleUpload}>
                <Button icon={<UploadOutlined />}>上传图片</Button>
              </Upload>
              <Button onClick={() => setTemplateModalVisible(true)}>保存模板</Button>
            </div>
          </div>

          <Spin spinning={loading}>
            {assets.length > 0 ? (
              <>
                <Row gutter={[12, 12]}>
                  {assets.map(renderAssetCard)}
                </Row>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Pagination
                    current={page}
                    total={total}
                    pageSize={pageSize}
                    onChange={setPage}
                    showTotal={(t) => `共 ${t} 项`}
                  />
                </div>
              </>
            ) : (
              <Empty description="暂无素材" />
            )}
          </Spin>
        </Card>
      </Content>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑素材"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="名称">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              options={PRESET_TAGS.map(t => ({ label: t, value: t }))}
            />
          </Form.Item>
          <Form.Item name="is_shared" label="共享给团队" valuePropName="checked">
            <Select options={[{ value: true, label: '是' }, { value: false, label: '否' }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="素材详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          selectedAsset?.type === 'image' ? [
            <Button key="first" onClick={() => handleUseAsFrame(selectedAsset, 'first')}>用作首帧</Button>,
            <Button key="last" onClick={() => handleUseAsFrame(selectedAsset, 'last')}>用作尾帧</Button>,
            <Button key="close" onClick={() => setDetailModalVisible(false)}>关闭</Button>,
          ] : [
            <Button key="close" onClick={() => setDetailModalVisible(false)}>关闭</Button>,
          ]
        }
        width={800}
      >
        {selectedAsset && (
          <div>
            {selectedAsset.type === 'image' && (
              <Image src={selectedAsset.file_url} width="100%" style={{ marginBottom: 16 }} />
            )}
            {selectedAsset.type === 'video' && selectedAsset.file_url && (
              <video src={selectedAsset.file_url} controls style={{ width: '100%', marginBottom: 16 }} />
            )}
            {selectedAsset.type === 'prompt_template' && (
              <Card style={{ marginBottom: 16, background: '#f5f5f5' }}>
                <Text>{selectedAsset.content}</Text>
              </Card>
            )}
            <div>
              <Text strong>名称：</Text>{selectedAsset.name || '未命名'}<br />
              <Text strong>类型：</Text>{selectedAsset.type}<br />
              <Text strong>来源：</Text>{selectedAsset.source}<br />
              <Text strong>创建时间：</Text>{dayjs(selectedAsset.created_at).format('YYYY-MM-DD HH:mm:ss')}<br />
              {selectedAsset.description && <><Text strong>描述：</Text>{selectedAsset.description}<br /></>}
            </div>
          </div>
        )}
      </Modal>

      {/* 提示词模板弹窗 */}
      <Modal
        title="保存提示词模板"
        open={templateModalVisible}
        onOk={handleSaveTemplate}
        onCancel={() => setTemplateModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：产品展示-高端风" />
          </Form.Item>
          <Form.Item name="content" label="提示词内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={4} placeholder="输入提示词模板内容..." />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              options={PRESET_TAGS.map(t => ({ label: t, value: t }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Assets;
