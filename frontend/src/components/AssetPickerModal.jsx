/**
 * 素材库选图弹窗
 * 从素材库中选择图片素材
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Tabs, Input, Row, Col, Image, Empty, Spin, Pagination } from 'antd';
import { listAssets } from '../services/api';

const { Search } = Input;

const AssetPickerModal = ({ open, onCancel, onSelect }) => {
  const [scope, setScope] = useState('my');
  const [keyword, setKeyword] = useState('');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const pageSize = 12;

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAssets({
        scope,
        type: 'image',
        keyword,
        page,
        page_size: pageSize,
      });
      setAssets(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [scope, keyword, page]);

  useEffect(() => {
    if (open) {
      loadAssets();
    }
  }, [open, loadAssets]);

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setPage(1);
    }
  }, [open]);

  const handleConfirm = () => {
    const selected = assets.find(a => a.id === selectedId);
    if (selected) {
      onSelect(selected.file_url);
      onCancel();
    }
  };

  return (
    <Modal
      title="从素材库选择图片"
      open={open}
      onCancel={onCancel}
      width={800}
      onOk={handleConfirm}
      okText="使用选中图片"
      okButtonProps={{ disabled: !selectedId }}
      cancelText="取消"
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Tabs
          activeKey={scope}
          onChange={(key) => { setScope(key); setPage(1); }}
          items={[
            { key: 'my', label: '我的素材' },
            { key: 'shared', label: '团队共享' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <Search
          placeholder="搜索素材"
          style={{ width: 200 }}
          onSearch={(v) => { setKeyword(v); setPage(1); }}
          allowClear
        />
      </div>

      <Spin spinning={loading}>
        {assets.length > 0 ? (
          <>
            <Row gutter={[12, 12]}>
              {assets.map((asset) => (
                <Col span={6} key={asset.id}>
                  <div
                    onClick={() => setSelectedId(asset.id)}
                    style={{
                      border: selectedId === asset.id ? '3px solid #1890ff' : '3px solid transparent',
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <Image
                      src={asset.file_url}
                      width="100%"
                      height={120}
                      style={{ objectFit: 'cover' }}
                      preview={false}
                    />
                    <div style={{ padding: '4px 8px', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {asset.name || '未命名'}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Pagination
                current={page}
                total={total}
                pageSize={pageSize}
                onChange={setPage}
                showSizeChanger={false}
                size="small"
              />
            </div>
          </>
        ) : (
          <Empty description="暂无图片素材" />
        )}
      </Spin>
    </Modal>
  );
};

export default AssetPickerModal;
