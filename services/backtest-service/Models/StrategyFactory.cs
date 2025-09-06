namespace BacktestService.Models
{
    public class StrategyInfo
    {
        public string Name { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool RequiresAI { get; set; }
        public int MinimumDataPoints { get; set; }
        public Dictionary<string, object> DefaultParameters { get; set; } = new();
        public List<ParameterInfo> Parameters { get; set; } = new();
    }

    public class ParameterInfo
    {
        public string Name { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public object DefaultValue { get; set; } = new();
        public object? MinValue { get; set; }
        public object? MaxValue { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class StrategyFactory
    {
        private static readonly Dictionary<string, Type> _strategyRegistry = new();
        private static readonly Dictionary<string, StrategyInfo> _strategyInfo = new();

        static StrategyFactory()
        {
            RegisterStrategies();
        }

        private static void RegisterStrategies()
        {
            // Register Moving Average Crossover Strategy
            RegisterStrategy<MovingAverageCrossoverStrategy>("MOVING_AVERAGE_CROSSOVER", new StrategyInfo
            {
                Name = "MOVING_AVERAGE_CROSSOVER",
                DisplayName = "Moving Average Crossover",
                Description = "Generates signals based on the crossover of short and long moving averages",
                RequiresAI = false,
                MinimumDataPoints = 50,
                DefaultParameters = new Dictionary<string, object>
                {
                    ["ShortPeriod"] = 10,
                    ["LongPeriod"] = 20,
                    ["Threshold"] = 0.001m
                },
                Parameters = new List<ParameterInfo>
                {
                    new() { Name = "ShortPeriod", DisplayName = "Short Period", Type = "int", DefaultValue = 10, MinValue = 1, MaxValue = 50, Description = "Period for short moving average" },
                    new() { Name = "LongPeriod", DisplayName = "Long Period", Type = "int", DefaultValue = 20, MinValue = 1, MaxValue = 200, Description = "Period for long moving average" },
                    new() { Name = "Threshold", DisplayName = "Threshold", Type = "decimal", DefaultValue = 0.001m, MinValue = 0.0m, MaxValue = 0.1m, Description = "Minimum price deviation threshold" }
                }
            });

            // Register RSI Strategy
            RegisterStrategy<RSIStrategy>("RSI", new StrategyInfo
            {
                Name = "RSI",
                DisplayName = "Relative Strength Index",
                Description = "Generates signals based on RSI oversold/overbought conditions",
                RequiresAI = false,
                MinimumDataPoints = 30,
                DefaultParameters = new Dictionary<string, object>
                {
                    ["Period"] = 14,
                    ["OversoldThreshold"] = 30m,
                    ["OverboughtThreshold"] = 70m
                },
                Parameters = new List<ParameterInfo>
                {
                    new() { Name = "Period", DisplayName = "RSI Period", Type = "int", DefaultValue = 14, MinValue = 2, MaxValue = 50, Description = "Period for RSI calculation" },
                    new() { Name = "OversoldThreshold", DisplayName = "Oversold Threshold", Type = "decimal", DefaultValue = 30m, MinValue = 0m, MaxValue = 50m, Description = "RSI level considered oversold" },
                    new() { Name = "OverboughtThreshold", DisplayName = "Overbought Threshold", Type = "decimal", DefaultValue = 70m, MinValue = 50m, MaxValue = 100m, Description = "RSI level considered overbought" }
                }
            });

            // Register AI Prediction Strategy
            RegisterStrategy<AIPredictionStrategy>("AI_PREDICTION", new StrategyInfo
            {
                Name = "AI_PREDICTION",
                DisplayName = "AI Prediction",
                Description = "Generates signals based on AI model predictions",
                RequiresAI = true,
                MinimumDataPoints = 100,
                DefaultParameters = new Dictionary<string, object>
                {
                    ["ConfidenceThreshold"] = 0.6m,
                    ["PredictionThreshold"] = 0.02m,
                    ["UseTrendDirection"] = true
                },
                Parameters = new List<ParameterInfo>
                {
                    new() { Name = "ConfidenceThreshold", DisplayName = "Confidence Threshold", Type = "decimal", DefaultValue = 0.6m, MinValue = 0.0m, MaxValue = 1.0m, Description = "Minimum AI confidence required" },
                    new() { Name = "PredictionThreshold", DisplayName = "Prediction Threshold", Type = "decimal", DefaultValue = 0.02m, MinValue = 0.0m, MaxValue = 0.5m, Description = "Minimum predicted price change" },
                    new() { Name = "UseTrendDirection", DisplayName = "Use Trend Direction", Type = "bool", DefaultValue = true, Description = "Use trend direction instead of price prediction" }
                }
            });
        }

        private static void RegisterStrategy<T>(string name, StrategyInfo info) where T : ITradingStrategy
        {
            _strategyRegistry[name] = typeof(T);
            _strategyInfo[name] = info;
        }

        public static ITradingStrategy CreateStrategy(string strategyName)
        {
            if (!_strategyRegistry.ContainsKey(strategyName))
            {
                throw new ArgumentException($"Strategy '{strategyName}' is not registered");
            }

            var strategyType = _strategyRegistry[strategyName];
            var strategy = (ITradingStrategy)Activator.CreateInstance(strategyType)!;
            
            return strategy;
        }

        public static ITradingStrategy CreateStrategy(string strategyName, StrategyParameters parameters)
        {
            var strategy = CreateStrategy(strategyName);
            strategy.Initialize(parameters);
            return strategy;
        }

        public static List<StrategyInfo> GetAvailableStrategies()
        {
            return _strategyInfo.Values.ToList();
        }

        public static StrategyInfo? GetStrategyInfo(string strategyName)
        {
            return _strategyInfo.GetValueOrDefault(strategyName);
        }

        public static bool IsStrategyRegistered(string strategyName)
        {
            return _strategyRegistry.ContainsKey(strategyName);
        }

        public static List<string> GetStrategyNames()
        {
            return _strategyRegistry.Keys.ToList();
        }
    }
}

