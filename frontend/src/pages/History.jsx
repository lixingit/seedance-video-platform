/**
 * 历史记录页面
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
  List,
  Tag,
  Space,
  Modal,
  Form,
  message,
  Spin,
  Tooltip,
  Popconfirm,
  Empty,
} from 'antd';
import {
  VideoCameraOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  listTasks,
  refreshTask,
  updateTaskTags,
  updateTaskNotes,
  deleteTask,
  getUsername,
} from '../services/api';

const { Content, Header } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

// 状态标签颜色
const STATUS_COLORS = {
  pending: 'default',
  processing: 'blue',
  succeeded: 'green',
  failed: 'red',
};

// 预置标签
const PRESET_TAGS = ['成片可用', '测试', '需优化', '参考案例', '产品素材', '空镜'];

const History = () => {
  const [activeTab, setActiveTab] = useState('my');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState({});
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [tagForm] = Form.useForm();
  const [notesForm] = Form.useForm();

  const username = getUsername();
  const navigate = useNavigate();

  // 加载任务列表
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTasks({
        all_team: activeTab === 'all',
        search: searchText,
      });
      setTasks(data);
    } catch (error) {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchText]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 自动刷新（每3秒）
  useEffect(() => {
    const hasProcessingTasks = tasks.some(t => t.status === 'pending' || t.status === 'processing');
    if (!hasProcessingTasks) return;

    const interval = setInterval(() => {
      const processingIds = tasks
        .filter(t => t.status === 'pending' || t.status === 'processing')
        .map(t => t.id);
      if (processingIds.length > 0) {
        loadTasks();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [tasks, loadTasks]);

  // 手动刷新单个任务
  const handleRefresh = async (taskId) => {
    setRefreshLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      await refreshTask(taskId);
      message.success('任务状态已更新');
      loadTasks();
    } catch (error) {
      message.error('刷新失败');
    } finally {
      setRefreshLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // 打开详情
  const handleViewDetail = (task) => {
    setSelectedTask(task);
    setDetailModalVisible(true);
  };

  // 打开标签编辑
  const handleEditTags = (task) => {
    setSelectedTask(task);
    tagForm.setFieldsValue({ tags: task.tags_list || [] });
    setTagModalVisible(true);
  };

  // 保存标签
  const handleSaveTags = async () => {
    try {
      const values = await tagForm.validateFields();
      await updateTaskTags(selectedTask.id, values.tags);
      message.success('标签已更新');
      setTagModalVisible(false);
      loadTasks();
    } catch (error) {
      message.error('保存标签失败');
    }
  };

  // 打开备注编辑
  const handleEditNotes = (task) => {
    setSelectedTask(task);
    notesForm.setFieldsValue({ notes: task.notes || '' });
    setNotesModalVisible(true);
  };

  // 保存备注
  const handleSaveNotes = async () => {
    try {
      const values = await notesForm.validateFields();
      await updateTaskNotes(selectedTask.id, values.notes);
      message.success('备注已更新');
      setNotesModalVisible(false);
      loadTasks();
    } catch (error) {
      message.error('保存备注失败');
    }
  };

  // 删除任务
  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId);
      message.success('任务已删除');
      loadTasks();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 复制提示词
  const handleCopyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt);
    message.success('提示词已复制');
  };

  const renderTaskItem = (task) => (
    <List.Item
      key={task.id}
      actions={[
        <Tooltip title="刷新状态">
          <Button
            type="text"
            icon={<ReloadOutlined />}
            loading={refreshLoading[task.id]}
            onClick={() => handleRefresh(task.id)}
            disabled={task.status === 'succeeded' || task.status === 'failed'}
          />
        </Tooltip>,
        <Tooltip title="编辑标签">
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={() => handleEditTags(task)}
          />
        </Tooltip>,
        <Tooltip title="编辑备注">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditNotes(task)}
          />
        </Tooltip>,
        <Popconfirm
          title="确定要删除这个任务吗？"
          onConfirm={() => handleDelete(task.id)}
          okText="确定"
          cancelText="取消"
        >
          <Tooltip title="删除">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>,
      ]}
    >
      <List.Item.Meta
        avatar={
          task.video_url ? (
            <video
              src={task.video_url}
              style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 4 }}
              controls
            />
          ) : (
            <div style={{
              width: 120,
              height: 68,
              background: '#f0f0f0',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Spin spinning={task.status === 'pending' || task.status === 'processing'} />
            </div>
          )
        }
        title={
          <Space>
            <Text strong onClick={() => handleViewDetail(task)} style={{ cursor: 'pointer' }}>
              {task.prompt.length > 50 ? `${task.prompt.slice(0, 50)}...` : task.prompt}
            </Text>
            <Tag color={STATUS_COLORS[task.status]}>
              {task.status === 'pending' ? '等待中' :
               task.status === 'processing' ? '生成中' :
               task.status === 'succeeded' ? '已完成' : '失败'}
            </Tag>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyPrompt(task.prompt)}
            />
          </Space>
        }
        description={
          <Space direction="vertical" size="small">
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(task.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {task.duration}秒
              </Text>
            </Space>
            <Space size="small">
              {(task.tags_list || []).map(tag => (
                <Tag key={tag} size="small">{tag}</Tag>
              ))}
            </Space>
            {task.notes && (
              <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                备注: {task.notes}
              </Text>
            )}
          </Space>
        }
      />
    </List.Item>
  );

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
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/generate')}
          />
          <VideoCameraOutlined style={{ fontSize: 24, color: '#1890ff', margin: '0 12px' }} />
          <Title level={4} style={{ margin: 0 }}>历史记录</Title>
        </div>
        <Text>当前用户：{username}</Text>
      </Header>

      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                { key: 'my', label: '我的生成' },
                { key: 'all', label: '全部团队' },
              ]}
            />
            <Search
              placeholder="搜索提示词或备注"
              style={{ width: 300 }}
              onSearch={setSearchText}
              allowClear
            />
          </div>

          <List
            loading={loading}
            dataSource={tasks}
            renderItem={renderTaskItem}
            locale={{
              empty: <Empty description="暂无任务" />,
            }}
          />
        </Card>
      </Content>

      {/* 详情弹窗 */}
      <Modal
        title="任务详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedTask && (
          <div>
            {selectedTask.video_url && (
              <video
                src={selectedTask.video_url}
                style={{ width: '100%', marginBottom: 16 }}
                controls
              />
            )}
            <Paragraph>
              <Text strong>提示词：</Text>
              {selectedTask.prompt}
            </Paragraph>
            <Space wrap>
              <Text type="secondary">状态：</Text>
              <Tag color={STATUS_COLORS[selectedTask.status]}>
                {selectedTask.status}
              </Tag>
              <Text type="secondary">时长：{selectedTask.duration}秒</Text>
              <Text type="secondary">
                创建时间：{dayjs(selectedTask.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Text>
            </Space>
            {selectedTask.tags_list?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong>标签：</Text>
                <Space style={{ marginLeft: 8 }}>
                  {selectedTask.tags_list.map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}
            {selectedTask.notes && (
              <div style={{ marginTop: 16 }}>
                <Text strong>备注：</Text>
                <Paragraph style={{ marginTop: 8, background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                  {selectedTask.notes}
                </Paragraph>
              </div>
            )}
            {selectedTask.error_message && (
              <div style={{ marginTop: 16 }}>
                <Text type="danger" strong>错误信息：</Text>
                <Paragraph type="danger" style={{ marginTop: 8 }}>
                  {selectedTask.error_message}
                </Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 标签编辑弹窗 */}
      <Modal
        title="编辑标签"
        open={tagModalVisible}
        onOk={handleSaveTags}
        onCancel={() => setTagModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={tagForm} layout="vertical">
          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="请输入或选择标签"
              options={PRESET_TAGS.map(tag => ({ label: tag, value: tag }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 备注编辑弹窗 */}
      <Modal
        title="编辑备注"
        open={notesModalVisible}
        onOk={handleSaveNotes}
        onCancel={() => setNotesModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={notesForm} layout="vertical">
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={6} placeholder="记录使用场景、修改意见、复用说明等" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default History;
