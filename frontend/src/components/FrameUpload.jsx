/**
 * 首帧/尾帧图片上传组件
 * 支持三种方式：上传图片、从素材库选、AI生成备选
 */
import React, { useState } from 'react';
import { Upload, Button, Space, Image, message } from 'antd';
import {
  UploadOutlined,
  PictureOutlined,
  RobotOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { uploadImage } from '../services/api';

const FrameUpload = ({ label, value, onChange, onPickFromLibrary, onAIGenerate }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const result = await uploadImage(file);
      onChange(result.file_url);
      message.success('图片上传成功');
    } catch (error) {
      message.error('图片上传失败');
    } finally {
      setUploading(false);
    }
    return false; // prevent default upload
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div style={{
      border: '1px dashed #d9d9d9',
      borderRadius: 8,
      padding: 16,
      textAlign: 'center',
      background: '#fafafa',
    }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>{label}</div>

      {value ? (
        <div>
          <Image
            src={value}
            width={200}
            height={120}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            preview={true}
          />
          <div style={{ marginTop: 8 }}>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemove}
              size="small"
            >
              移除
            </Button>
          </div>
        </div>
      ) : (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Upload
            accept="image/jpeg,image/png,image/webp"
            showUploadList={false}
            beforeUpload={handleUpload}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} loading={uploading} block>
              上传图片
            </Button>
          </Upload>
          <Button
            icon={<PictureOutlined />}
            onClick={onPickFromLibrary}
            block
          >
            从素材库选
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={onAIGenerate}
            block
          >
            AI 生成备选
          </Button>
        </Space>
      )}
    </div>
  );
};

export default FrameUpload;
