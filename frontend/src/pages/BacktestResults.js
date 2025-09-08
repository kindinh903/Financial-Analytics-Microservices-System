import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Statistic, 
  Row, 
  Col, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Spin, 
  Alert, 
  Typography, 
  Divider,
  Progress,
  Tooltip
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  TrophyOutlined,
  DollarOutlined,
  PercentageOutlined,
  LineChartOutlined,
  HistoryOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { backtestService } from '../services/api';

const { Title, Text } = Typography;

const BacktestResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const response = await backtestService.getBacktestResult(id);
        setResult(response.data);
      } catch (err) {
        console.error('Error fetching backtest result:', err);
        setError(err.response?.data?.message || 'Failed to load backtest result');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResult();
    }
  }, [id]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value, decimals = 2) => {
    return `${value?.toFixed(decimals)}%`;
  };

  const formatLargeNumber = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value?.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="Loading backtest results..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
        <Button type="primary" onClick={() => navigate('/backtest')}>
          Back to Backtest
        </Button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <Alert
          message="Backtest Result Not Found"
          description="The requested backtest result could not be found."
          type="warning"
          showIcon
          className="mb-4"
        />
        <Button type="primary" onClick={() => navigate('/backtest')}>
          Back to Backtest
        </Button>
      </div>
    );
  }

  // Calculate derived metrics
  const profitLoss = result.finalBalance - result.initialBalance;
  const avgTradeReturn = result.totalTrades > 0 ? result.totalReturn / result.totalTrades : 0;
  const profitFactor = result.losingTrades > 0 && result.winningTrades > 0 ? 
    (result.winningTrades / result.totalTrades) / (result.losingTrades / result.totalTrades) : 0;

  // Prepare table columns for trades
  const tradeColumns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleString(),
      width: 150,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'BUY' ? 'green' : 'red'}>
          {type}
        </Tag>
      ),
      width: 80,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => formatCurrency(price),
      width: 120,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity) => quantity?.toFixed(6),
      width: 120,
    },
    {
      title: 'Commission',
      dataIndex: 'commission',
      key: 'commission',
      render: (commission) => formatCurrency(commission),
      width: 100,
    },
    {
      title: 'P&L',
      dataIndex: 'pnL',
      key: 'pnL',
      render: (pnL) => (
        <Text type={pnL >= 0 ? 'success' : 'danger'}>
          {formatCurrency(pnL)}
        </Text>
      ),
      width: 100,
    },
    {
      title: 'Correct',
      dataIndex: 'isCorrect',
      key: 'isCorrect',
      render: (isCorrect) => (
        <Tag color={isCorrect ? 'green' : 'red'}>
          {isCorrect ? 'Yes' : 'No'}
        </Tag>
      ),
      width: 80,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: {
        showTitle: false,
      },
      render: (reason) => (
        <Tooltip placement="topLeft" title={reason}>
          {reason}
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="mb-2">Backtest Results</Title>
          <Text type="secondary">
            {result.symbol} • {result.interval} • {new Date(result.startDate).toLocaleDateString()} - {new Date(result.endDate).toLocaleDateString()}
          </Text>
        </div>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={() => navigate('/backtest/history')}>
            View History
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/backtest')}>
            New Backtest
          </Button>
        </Space>
      </div>

      {/* Key Performance Indicators */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Return"
              value={result.totalReturnPercent}
              suffix="%"
              precision={2}
              valueStyle={{ 
                color: result.totalReturnPercent >= 0 ? '#3f8600' : '#cf1322',
                fontSize: '24px'
              }}
              prefix={result.totalReturnPercent >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Win Rate"
              value={result.winRate}
              suffix="%"
              precision={1}
              valueStyle={{ color: '#1890ff', fontSize: '24px' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Profit/Loss"
              value={profitLoss}
              precision={2}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ 
                color: profitLoss >= 0 ? '#3f8600' : '#cf1322',
                fontSize: '20px'
              }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Max Drawdown"
              value={result.maxDrawdown * 100}
              suffix="%"
              precision={2}
              valueStyle={{ color: '#cf1322', fontSize: '24px' }}
              prefix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Metrics */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="Financial Summary" extra={<DollarOutlined />}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Initial Balance"
                  value={result.initialBalance}
                  formatter={(value) => formatCurrency(value)}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Final Balance"
                  value={result.finalBalance}
                  formatter={(value) => formatCurrency(value)}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Total Return"
                  value={result.totalReturn}
                  formatter={(value) => formatCurrency(value)}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Avg Trade Return"
                  value={avgTradeReturn}
                  formatter={(value) => formatCurrency(value)}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="Trading Statistics" extra={<LineChartOutlined />}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="Total Trades" value={result.totalTrades} />
              </Col>
              <Col span={12}>
                <div>
                  <Text type="secondary">Win/Loss Ratio</Text>
                  <div className="mt-1">
                    <Progress 
                      percent={result.winRate} 
                      format={() => `${result.winningTrades}/${result.losingTrades}`}
                      strokeColor="#52c41a"
                      trailColor="#ff4d4f"
                    />
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <Statistic title="Winning Trades" value={result.winningTrades} valueStyle={{ color: '#3f8600' }} />
              </Col>
              <Col span={12}>
                <Statistic title="Losing Trades" value={result.losingTrades} valueStyle={{ color: '#cf1322' }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Performance Metrics */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="Risk Metrics" extra={<PercentageOutlined />}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Sharpe Ratio"
                  value={result.sharpeRatio}
                  precision={4}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Max Drawdown"
                  value={result.maxDrawdown * 100}
                  suffix="%"
                  precision={2}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Accuracy"
                  value={result.accuracy * 100}
                  suffix="%"
                  precision={1}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Precision"
                  value={result.precision * 100}
                  suffix="%"
                  precision={1}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="AI Performance" extra={<TrophyOutlined />}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Precision"
                  value={result.precision * 100}
                  suffix="%"
                  precision={1}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Recall"
                  value={result.recall * 100}
                  suffix="%"
                  precision={1}
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="F1 Score"
                  value={result.f1Score * 100}
                  suffix="%"
                  precision={1}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Strategy Information */}
      <Card title="Strategy Information" className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text strong>Symbol:</Text> <Text>{result.symbol}</Text>
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Interval:</Text> <Text>{result.interval}</Text>
          </Col>
          <Col xs={24} md={8}>
            <Text strong>Duration:</Text> <Text>
              {Math.ceil((new Date(result.endDate) - new Date(result.startDate)) / (1000 * 60 * 60 * 24))} days
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Trade History */}
      {result.trades && result.trades.length > 0 && (
        <Card title={`Trade History (${result.trades.length} trades)`}>
          <Table
            columns={tradeColumns}
            dataSource={result.trades}
            rowKey={(record, index) => record.id || index}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} trades`,
            }}
            scroll={{ x: 800 }}
          />
        </Card>
      )}
    </div>
  );
};

export default BacktestResults;
