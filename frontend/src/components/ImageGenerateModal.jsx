/**
 * AI 图片生成弹窗
 * 输入提示词生成 4 张备选图片，选择一张
 */
import React, { useState } from 'react';
import { Modal, Input, Button, Row, Col, Image, Spin, message, Empty } from 'antd';
import { generateImages } from '../services/api';

const { TextArea } = Input;

const ImageGenerateModal = ({ open, onCancel, onSelect, initialPrompt }) => {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  // 当 modal 打开时重置并同步 prompt
  React.useEffect(() => {
    if (open) {
      setPrompt(initialPrompt || '');
      setImages([]);
      setErrors([]);
      setSelectedIndex(null);
    }
  }, [open, initialPrompt]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning('请输入图片描述');
      return;
    }
    setLoading(true);
    setImages([]);
    setErrors([]);
    setSelectedIndex(null);
    try {
      const result = await generateImages({ prompt: prompt.trim(), n: 4 });
      setImages(result.images || []);
      setErrors(result.errors || []);
      if (result.images?.length === 0) {
        message.error('图片生成失败，请重试');
      }
    } catch (error) {
      message.error('图片生成请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedIndex === null || !images[selectedIndex]) {
      message.warning('请选择一张图片');
      return;
    }
    onSelect(images[selectedIndex].file_url);
    onCancel();
  };

  return (
    <Modal
      title="AI 生成备选图片"
      open={open}
      onCancel={onCancel}
      width={720}
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button
          key="confirm"
          type="primary"
          disabled={selectedIndex === null}
          onClick={handleConfirm}
        >
          使用选中图片
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="描述想要生成的图片内容..."
          maxLength={500}
          showCount
        />
        <Button
          type="primary"
          onClick={handleGenerate}
          loading={loading}
          style={{ marginTop: 8 }}
        >
          生成图片
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="正在生成图片，请稍候..." />
        </div>
      ) : images.length > 0 ? (
        <Row gutter={[12, 12]}>
          {images.map((img, index) => (
            <Col span={12} key={index}>
              <div
                onClick={() => setSelectedIndex(index)}
                style={{
                  border: selectedIndex === index ? '3px solid #1890ff' : '3px solid transparent',
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <Image
                  src={img.file_url}
                  width="100%"
                  height={200}
                  style={{ objectFit: 'cover' }}
                  preview={false}
                />
              </div>
            </Col>
          ))}
        </Row>
      ) : (
        !loading && <Empty description="点击"生成图片"开始" />
      )}

      {errors.length > 0 && (
        <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12 }}>
          {errors.length} 张图片生成失败
        </div>
      )}
    </Modal>
  );
};

export default ImageGenerateModal;
