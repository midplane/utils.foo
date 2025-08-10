import React, { useState, useCallback, useMemo, useRef } from "react";
import OptimizedChart from "../components/OptimizedChart";

// Utility functions extracted for better organization
const DateUtils = {
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Handle Unix timestamps
    if (!isNaN(dateStr) && dateStr.toString().length >= 10) {
      const timestamp = Number(dateStr);
      const date = new Date(timestamp.toString().length === 10 ? timestamp * 1000 : timestamp);
      if (!isNaN(date.getTime())) return date;
    }

    // Try parsing as ISO string or common formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    // Try common formats manually
    const formats = [
      /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/, // YYYY-MM-DD HH:mm:ss
      /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/, // MM/DD/YYYY HH:mm:ss
      /(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/, // MM-DD-YYYY HH:mm:ss
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const [, p1, p2, p3, p4, p5, p6] = match;
        let year, month, day;
        
        if (format === formats[0]) { // YYYY-MM-DD
          [year, month, day] = [parseInt(p1), parseInt(p2) - 1, parseInt(p3)];
        } else { // MM/DD/YYYY or MM-DD-YYYY
          [year, month, day] = [parseInt(p3), parseInt(p1) - 1, parseInt(p2)];
        }
        
        const parsedDate = new Date(year, month, day, parseInt(p4), parseInt(p5), parseInt(p6));
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }
    }

    return null;
  },

  formatDate(date, formatStr = "yyyy-MM-dd HH:mm:ss") {
    if (!date || !(date instanceof Date)) return '';
    
    const pad = (n) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[date.getMonth()];
    
    return formatStr
      .replace('yyyy', year)
      .replace('MMM', monthName)
      .replace('MM', month)
      .replace('dd', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace(/\bd\b/g, date.getDate());
  },

  startOfHour(date) {
    const newDate = new Date(date);
    newDate.setMinutes(0, 0, 0);
    return newDate;
  },

  startOfDay(date) {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }
};

// Statistics utilities
const StatsUtils = {
  calculateAutocorrelation(series, lag) {
    if (lag >= series.length || lag < 1) return 0;
    
    const n = series.length - lag;
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (series[i] - mean) * (series[i + lag] - mean);
    }
    
    for (let i = 0; i < series.length; i++) {
      denominator += Math.pow(series[i] - mean, 2);
    }
    
    return denominator === 0 ? 0 : numerator / denominator;
  },

  calculateMean(values) {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  },

  calculateStdDev(values) {
    if (values.length <= 1) return 0;
    const mean = this.calculateMean(values);
    const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }
};

// CSV parsing utility
const CsvUtils = {
  parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header row and one data row");
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map((line, index) => {
      try {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        return row;
      } catch (error) {
        console.warn(`Error parsing line ${index + 2}: ${line}`);
        return null;
      }
    }).filter(row => row !== null);
    
    return data;
  }
};

// Main component
const AnomalyDetection = React.memo(() => {
  // State management
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [aggregationLevel, setAggregationLevel] = useState("raw");
  const [aggregationFn, setAggregationFn] = useState("avg");
  const [sensitivityThreshold, setSensitivityThreshold] = useState(2.5);
  const [seasonalityPattern, setSeasonalityPattern] = useState("auto");
  const [customSeasonalityPeriod, setCustomSeasonalityPeriod] = useState(24);
  const [detectedPatterns, setDetectedPatterns] = useState([]);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [anomalyDirection, setAnomalyDirection] = useState("both");
  
  // Refs for file input
  const fileInputRef = useRef(null);

  // Advanced seasonality detection using autocorrelation
  const detectSeasonalPatterns = useCallback((data) => {
    if (data.length < 10) return [];
    
    const values = data.map(d => d.value);
    const timeGaps = [];
    
    // Calculate time gaps between consecutive points
    for (let i = 1; i < data.length; i++) {
      const gap = (data[i].timestamp.getTime() - data[i-1].timestamp.getTime()) / (1000 * 60); // minutes
      timeGaps.push(gap);
    }
    
    const avgGap = StatsUtils.calculateMean(timeGaps);
    
    // Test different seasonal periods based on data frequency
    const testPeriods = [];
    
    if (avgGap <= 1) { // Sub-hourly data
      testPeriods.push(
        { name: "Hourly", period: Math.round(60 / avgGap), description: "60-minute cycle" },
        { name: "Daily", period: Math.round(1440 / avgGap), description: "24-hour cycle" },
        { name: "Weekly", period: Math.round(10080 / avgGap), description: "7-day cycle" }
      );
    } else if (avgGap <= 60) { // Hourly data
      testPeriods.push(
        { name: "Daily", period: Math.round(1440 / avgGap), description: "24-hour cycle" },
        { name: "Weekly", period: Math.round(10080 / avgGap), description: "7-day cycle" },
        { name: "Monthly", period: Math.round(43200 / avgGap), description: "30-day cycle" }
      );
    } else if (avgGap <= 1440) { // Daily data
      testPeriods.push(
        { name: "Weekly", period: 7, description: "7-day cycle" },
        { name: "Monthly", period: 30, description: "30-day cycle" },
        { name: "Quarterly", period: 90, description: "90-day cycle" }
      );
    } else { // Less frequent data
      testPeriods.push(
        { name: "Monthly", period: Math.round(30 / (avgGap / 1440)), description: "30-day cycle" },
        { name: "Quarterly", period: Math.round(90 / (avgGap / 1440)), description: "90-day cycle" },
        { name: "Yearly", period: Math.round(365 / (avgGap / 1440)), description: "365-day cycle" }
      );
    }
    
    // Calculate autocorrelation for each test period
    const patterns = testPeriods
      .filter(p => p.period > 2 && p.period < values.length / 3)
      .map(testPeriod => {
        const autocorr = StatsUtils.calculateAutocorrelation(values, testPeriod.period);
        return {
          ...testPeriod,
          strength: autocorr,
          confidence: autocorr > 0.3 ? "High" : autocorr > 0.15 ? "Medium" : "Low"
        };
      })
      .filter(p => p.strength > 0.1)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 4);
    
    return patterns;
  }, []);

  // Get the optimal seasonality period based on current selection
  const getSeasonalityPeriod = useCallback((data) => {
    if (seasonalityPattern === "custom") {
      return Math.max(2, Math.min(customSeasonalityPeriod, Math.floor(data.length / 3)));
    }
    
    if (seasonalityPattern === "auto") {
      const patterns = detectSeasonalPatterns(data);
      return patterns.length > 0 ? patterns[0].period : 24;
    }
    
    // Calculate period for predefined patterns
    if (data.length < 2) return 24;
    
    const timeGaps = [];
    for (let i = 1; i < data.length; i++) {
      const gap = (data[i].timestamp.getTime() - data[i-1].timestamp.getTime()) / (1000 * 60);
      timeGaps.push(gap);
    }
    const avgGap = StatsUtils.calculateMean(timeGaps);
    
    switch (seasonalityPattern) {
      case "hourly": return Math.max(1, Math.round(60 / avgGap));
      case "daily": return Math.max(1, Math.round(1440 / avgGap));
      case "weekly": return Math.max(1, Math.round(10080 / avgGap));
      case "monthly": return Math.max(1, Math.round(43200 / avgGap));
      default: return 24;
    }
  }, [seasonalityPattern, customSeasonalityPeriod, detectSeasonalPatterns]);

  // Data aggregation with improved error handling
  const aggregateData = useCallback((data) => {
    if (aggregationLevel === "raw") return data;

    const groups = new Map();
    
    data.forEach(item => {
      let periodStart;
      try {
        switch (aggregationLevel) {
          case "hour":
            periodStart = DateUtils.startOfHour(item.timestamp);
            break;
          case "day":
            periodStart = DateUtils.startOfDay(item.timestamp);
            break;
          default:
            periodStart = item.timestamp;
        }

        const key = periodStart.getTime();
        if (!groups.has(key)) {
          groups.set(key, { timestamp: periodStart, values: [] });
        }
        groups.get(key).values.push(item.value);
      } catch (error) {
        console.warn('Error aggregating data point:', item, error);
      }
    });

    return Array.from(groups.values()).map(group => {
      let value;
      const values = group.values.filter(v => !isNaN(v) && isFinite(v));
      
      if (values.length === 0) return null;
      
      switch (aggregationFn) {
        case "avg":
          value = StatsUtils.calculateMean(values);
          break;
        case "sum":
          value = values.reduce((a, b) => a + b, 0);
          break;
        case "min":
          value = Math.min(...values);
          break;
        case "max":
          value = Math.max(...values);
          break;
        case "count":
          value = values.length;
          break;
        default:
          value = values[0];
      }
      
      return { timestamp: group.timestamp, value };
    })
    .filter(item => item !== null)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [aggregationLevel, aggregationFn]);

  // Improved anomaly detection with robust statistics
  const detectAnomalies = useCallback((data) => {
    if (data.length < 3) {
      return data.map(item => ({ 
        ...item, 
        isAnomaly: false, 
        deviation: 0,
        signedDeviation: 0, 
        mean: item.value, 
        stdDev: 0 
      }));
    }

    const seasonalPeriod = getSeasonalityPeriod(data);
    const seasonalStats = new Map();
    
    // Group data by seasonal position within the period
    data.forEach((item, index) => {
      const seasonalKey = index % seasonalPeriod;
      
      if (!seasonalStats.has(seasonalKey)) {
        seasonalStats.set(seasonalKey, { values: [] });
      }
      seasonalStats.get(seasonalKey).values.push(item.value);
    });

    // Calculate statistics for each seasonal position
    seasonalStats.forEach(stats => {
      if (stats.values.length > 0) {
        stats.mean = StatsUtils.calculateMean(stats.values);
        stats.stdDev = StatsUtils.calculateStdDev(stats.values);
      }
    });
    
    // Detect anomalies using seasonal expectations
    return data.map((item, index) => {
      const seasonalKey = index % seasonalPeriod;
      const stats = seasonalStats.get(seasonalKey);
      
      if (!stats) {
        return { ...item, isAnomaly: false, deviation: 0, signedDeviation: 0, mean: item.value, stdDev: 0 };
      }
      
      const signedDeviation = stats.stdDev > 0 ? (item.value - stats.mean) / stats.stdDev : 0;
      const deviation = Math.abs(signedDeviation);
      
      let isAnomaly = false;
      if (deviation > sensitivityThreshold) {
        if (anomalyDirection === "both") {
          isAnomaly = true;
        } else if (anomalyDirection === "positive" && signedDeviation > 0) {
          isAnomaly = true;
        } else if (anomalyDirection === "negative" && signedDeviation < 0) {
          isAnomaly = true;
        }
      }
      
      return {
        ...item,
        mean: stats.mean,
        stdDev: stats.stdDev,
        deviation: deviation,
        signedDeviation: signedDeviation,
        isAnomaly,
        seasonalPosition: seasonalKey
      };
    });
  }, [getSeasonalityPeriod, sensitivityThreshold, anomalyDirection]);

  // Memoize processed data to avoid unnecessary recalculations
  const parsedData = useMemo(() => {
    if (rawData.length === 0) return [];
    
    try {
      const aggregatedData = aggregateData(rawData);
      return detectAnomalies(aggregatedData);
    } catch (error) {
      console.error('Error processing data:', error);
      setError('Error processing data: ' + error.message);
      return [];
    }
  }, [rawData, aggregateData, detectAnomalies]);

  // Update detected patterns when data changes
  const updateDetectedPatterns = useCallback((data) => {
    try {
      if (data.length > 0) {
        const patterns = detectSeasonalPatterns(data);
        setDetectedPatterns(patterns);
      }
    } catch (error) {
      console.error('Error detecting patterns:', error);
    }
  }, [detectSeasonalPatterns]);

  // Detect patterns when raw data changes
  useMemo(() => {
    if (rawData.length > 0) {
      updateDetectedPatterns(rawData);
    }
  }, [rawData, updateDetectedPatterns]);

  // Improved data validation and parsing
  const validateAndParseData = useCallback(async (data) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!data || data.length === 0) {
        throw new Error("No data provided");
      }

      const headers = Object.keys(data[0]);
      const timestampCol = headers.find(h => 
        h.toLowerCase().includes('timestamp') || 
        h.toLowerCase().includes('time') || 
        h.toLowerCase().includes('date')
      );
      const valueCol = headers.find(h => 
        h.toLowerCase().includes('value') || 
        h.toLowerCase().includes('amount') || 
        h.toLowerCase().includes('price') ||
        h.toLowerCase().includes('count')
      );

      if (!timestampCol || !valueCol) {
        throw new Error(`CSV must have timestamp and value columns. Found columns: ${headers.join(', ')}`);
      }

      let validRows = 0;
      const warnings = [];
      
      const parsed = data.map((row, index) => {
        if (!row[timestampCol] || row[valueCol] === undefined || row[valueCol] === '') {
          return null; // Skip empty rows
        }

        const parsedDate = DateUtils.parseDate(row[timestampCol]);
        const parsedValue = parseFloat(row[valueCol]);

        if (!parsedDate) {
          warnings.push(`Invalid date format in row ${index + 1}: ${row[timestampCol]}`);
          return null;
        }

        if (isNaN(parsedValue) || !isFinite(parsedValue)) {
          warnings.push(`Invalid numeric value in row ${index + 1}: ${row[valueCol]}`);
          return null;
        }

        validRows++;
        return {
          timestamp: parsedDate,
          value: parsedValue,
          originalTimestamp: row[timestampCol]
        };
      }).filter(row => row !== null);

      if (parsed.length === 0) {
        throw new Error("No valid data rows found");
      }

      if (warnings.length > 0 && warnings.length <= 10) {
        console.warn('Data parsing warnings:', warnings);
      }

      if (parsed.length < data.length) {
        const skippedCount = data.length - parsed.length;
        setError(`Warning: ${skippedCount} rows were skipped due to invalid data`);
      }

      // Check for duplicate timestamps
      const timestampCounts = new Map();
      parsed.forEach(item => {
        const key = item.timestamp.getTime();
        timestampCounts.set(key, (timestampCounts.get(key) || 0) + 1);
      });
      
      const duplicates = Array.from(timestampCounts.entries()).filter(([, count]) => count > 1);
      if (duplicates.length > 0) {
        console.warn(`Found ${duplicates.length} duplicate timestamps`);
      }

      const sortedData = parsed.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setRawData(sortedData);
      setSuccess(`Successfully loaded ${validRows} data points`);
      
    } catch (err) {
      setError(err.message);
      console.error('Data validation error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Enhanced file upload handler
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 50 * 1024 * 1024) { // Increased to 50MB
      setError("File size too large. Please use files smaller than 50MB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const data = CsvUtils.parseCSV(csv);
        validateAndParseData(data);
      } catch (err) {
        setError("Error reading file: " + err.message);
      }
    };
    
    reader.onerror = () => {
      setError("Error reading file. Please try again.");
    };
    
    reader.readAsText(file);
  }, [validateAndParseData]);

  // Enhanced paste handler
  const handlePasteData = useCallback((event) => {
    const clipboardData = event.target.value;
    if (!clipboardData.trim()) return;
    
    try {
      const data = CsvUtils.parseCSV(clipboardData);
      validateAndParseData(data);
    } catch (err) {
      setError("Error parsing pasted data: " + err.message);
    }
  }, [validateAndParseData]);

  // Clear file input
  const clearData = useCallback(() => {
    setRawData([]);
    setDetectedPatterns([]);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (parsedData.length === 0) return null;
    
    const anomalyCount = parsedData.filter(item => item.isAnomaly).length;
    const values = parsedData.map(item => item.value);
    const mean = StatsUtils.calculateMean(values);
    const stdDev = StatsUtils.calculateStdDev(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return {
      total: parsedData.length,
      anomalies: anomalyCount,
      anomalyRate: ((anomalyCount / parsedData.length) * 100).toFixed(1),
      mean: mean.toFixed(2),
      stdDev: stdDev.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2)
    };
  }, [parsedData]);

  // Enhanced chart configuration
  const chartOption = useMemo(() => {
    if (parsedData.length === 0) return {};

    return {
      tooltip: {
        trigger: "axis",
        formatter: function(params) {
          if (!params || params.length === 0) return '';
          const point = params[0];
          const timestamp = new Date(point.value[0]);
          const data = parsedData.find(d => Math.abs(d.timestamp.getTime() - point.value[0]) < 1000);
          const actual = point.value[1].toFixed(2);
          const expected = data ? data.mean.toFixed(2) : 'N/A';
          const signedDeviation = data ? (data.signedDeviation >= 0 ? '+' : '') + data.signedDeviation.toFixed(2) : 'N/A';
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${DateUtils.formatDate(timestamp)}</div>
            <div style="margin-bottom: 4px;">📈 Actual: <strong>${actual}</strong></div>
            <div style="margin-bottom: 4px;">📊 Expected: <strong>${expected}</strong></div>
            <div style="margin-bottom: 4px;">📏 Deviation: <strong>${signedDeviation}σ</strong></div>
            ${data && data.isAnomaly ? '<div style="color: #ef4444; font-weight: 600;">⚠️ Anomaly Detected</div>' : '<div style="color: #10b981;">✅ Normal</div>'}
          `;
        },
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: { color: "#374151" }
      },
      grid: {
        left: "0%",
        right: "0%",
        bottom: "20%",
        top: "15%",
        containLabel: true
      },
      xAxis: {
        type: "time",
        axisLabel: {
          formatter: function(value) {
            const date = new Date(value);
            const timeRange = parsedData.length > 1 ? 
              (parsedData[parsedData.length - 1].timestamp.getTime() - parsedData[0].timestamp.getTime()) / (1000 * 60 * 60 * 24) : 0;
            
            if (timeRange > 90) {
              return DateUtils.formatDate(date, "MMM yyyy");
            } else if (timeRange > 30) {
              return DateUtils.formatDate(date, "MMM d");
            } else if (timeRange > 7) {
              return DateUtils.formatDate(date, "MMM d");
            } else if (timeRange > 2) {
              return DateUtils.formatDate(date, "MMM d\nHH:mm");
            } else if (timeRange > 0.5) {
              return DateUtils.formatDate(date, "MMM d HH:mm");
            } else {
              return DateUtils.formatDate(date, "HH:mm");
            }
          },
          rotate: 0,
          interval: 'auto',
          margin: 15,
          fontSize: 11,
          color: '#666',
          hideOverlap: true,
          maxInterval: 3600 * 1000 * 6
        },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisTick: { alignWithLabel: true, lineStyle: { color: '#d1d5db' } },
        splitLine: {
          show: true,
          lineStyle: { type: "dashed", color: "#e5e7eb", width: 1 }
        }
      },
      yAxis: {
        type: "value",
        name: aggregationFn === "count" ? "Count" : "Value",
        splitLine: {
          show: true,
          lineStyle: { type: "dashed", color: "#e5e7eb" }
        }
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          start: 0,
          end: 100,
          height: 30
        },
        {
          type: "inside",
          start: 0,
          end: 100
        }
      ],
      legend: {
        data: ["Actual Values", "Expected Pattern", "Anomalies"],
        top: 10,
        textStyle: { fontSize: 12 }
      },
      series: [
        {
          name: "Actual Values",
          type: "line",
          showSymbol: false,
          smooth: 0.2,
          data: parsedData.map(item => [item.timestamp.getTime(), item.value]),
          lineStyle: { width: 2, color: "#3b82f6" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59, 130, 246, 0.3)" },
                { offset: 1, color: "rgba(59, 130, 246, 0.05)" }
              ]
            }
          }
        },
        {
          name: "Expected Pattern",
          type: "line",
          showSymbol: false,
          smooth: 0.2,
          data: parsedData.map(item => [item.timestamp.getTime(), item.mean || item.value]),
          lineStyle: { width: 2, color: "#10b981", type: "dashed" }
        },
        {
          name: "Anomalies",
          type: "scatter",
          data: parsedData
            .filter(item => item.isAnomaly)
            .map(item => [item.timestamp.getTime(), item.value]),
          itemStyle: { 
            color: "#ef4444",
            borderColor: "#ffffff",
            borderWidth: 1
          },
          symbolSize: 10
        }
      ]
    };
  }, [parsedData, aggregationFn]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Anomaly Detection</h1>
          <p className="text-gray-600 text-lg">Upload your time series data to detect anomalies using statistical analysis</p>
        </div>

        {/* Data Input Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">Upload CSV File</label>
              {rawData.length > 0 && (
                <button
                  onClick={clearData}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear Data
                </button>
              )}
            </div>
            <div className="border-2 border-dashed border-gray-300 hover:border-gray-400 p-7 rounded-xl text-center cursor-pointer transition-all duration-200 hover:bg-gray-50">
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv,.txt" 
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600">Click to upload CSV file</p>
                <p className="text-sm text-gray-500 mt-1">Max file size: 50MB</p>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Or Paste CSV Data</label>
            <textarea
              onChange={handlePasteData}
              placeholder="timestamp,value&#10;2024-01-01 10:00:00,100&#10;2024-01-01 11:00:00,95&#10;..."
              className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="5"
            />
            <p className="text-sm text-gray-500 mt-1">Required columns: timestamp, value (or similar)</p>
          </div>
        </div>

        {/* Status Messages */}
        {isProcessing && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
            <span className="text-blue-700">Processing data...</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <strong>Success:</strong> {success}
          </div>
        )}

        {/* Data Preview */}
        {rawData.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowDataPreview(!showDataPreview)}
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium mb-3"
            >
              <span className="mr-2">{showDataPreview ? '▼' : '▶'}</span>
              Data Preview ({rawData.length} rows)
            </button>
            
            {showDataPreview && (
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold">Timestamp</th>
                      <th className="text-left p-2 font-semibold">Value</th>
                      <th className="text-left p-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{DateUtils.formatDate(row.timestamp)}</td>
                        <td className="p-2">{row.value}</td>
                        <td className="p-2">
                          <span className="text-green-600">✓ Valid</span>
                        </td>
                      </tr>
                    ))}
                    {rawData.length > 10 && (
                      <tr>
                        <td colSpan="3" className="p-2 text-gray-500 italic">
                          ... and {rawData.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Summary Statistics */}
        {summaryStats && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-700">{summaryStats.total}</div>
                <div className="text-xs text-blue-600">Total Points</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-red-700">{summaryStats.anomalies}</div>
                <div className="text-xs text-red-600">Anomalies</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-orange-700">{summaryStats.anomalyRate}%</div>
                <div className="text-xs text-orange-600">Anomaly Rate</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-green-700">{summaryStats.mean}</div>
                <div className="text-xs text-green-600">Mean</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-purple-700">{summaryStats.stdDev}</div>
                <div className="text-xs text-purple-600">Std Dev</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-700">{summaryStats.min}</div>
                <div className="text-xs text-gray-600">Minimum</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-700">{summaryStats.max}</div>
                <div className="text-xs text-gray-600">Maximum</div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Panel */}
        {parsedData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis Configuration</h3>
            
            {/* Detected Patterns Display */}
            {detectedPatterns.length > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">🔍 Detected Seasonal Patterns</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {detectedPatterns.map((pattern, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">{pattern.name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          pattern.confidence === 'High' ? 'bg-green-100 text-green-700' :
                          pattern.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {pattern.confidence}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{pattern.description}</div>
                      <div className="text-xs text-gray-500">
                        Correlation: {(pattern.strength * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aggregation Level</label>
                <select
                  value={aggregationLevel}
                  onChange={(e) => setAggregationLevel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="raw">Raw Data</option>
                  <option value="hour">Per Hour</option>
                  <option value="day">Per Day</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aggregation Function</label>
                <select
                  value={aggregationFn}
                  onChange={(e) => setAggregationFn(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={aggregationLevel === "raw"}
                >
                  <option value="avg">Average</option>
                  <option value="sum">Sum</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                  <option value="count">Count</option>
                </select>
                {aggregationLevel === "raw" && (
                  <div className="text-xs text-gray-500 mt-1">
                    Not applicable for raw data
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Anomaly Direction</label>
                <select
                  value={anomalyDirection}
                  onChange={(e) => setAnomalyDirection(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="both">Both Directions</option>
                  <option value="positive">Only Positive (Above Expected)</option>
                  <option value="negative">Only Negative (Below Expected)</option>
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  {anomalyDirection === "both" ? "Detect high and low anomalies" :
                   anomalyDirection === "positive" ? "Only detect spikes" :
                   "Only detect drops"}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seasonality Pattern</label>
                <select
                  value={seasonalityPattern}
                  onChange={(e) => setSeasonalityPattern(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="auto">🤖 Auto-Detect</option>
                  <option value="hourly">⏰ Hourly Pattern</option>
                  <option value="daily">📅 Daily Pattern</option>
                  <option value="weekly">📊 Weekly Pattern</option>
                  <option value="monthly">🗓️ Monthly Pattern</option>
                  <option value="custom">🔧 Custom Period</option>
                </select>
                
                {seasonalityPattern === "custom" && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      Period Length (2-{Math.floor(parsedData.length / 3)} data points)
                    </label>
                    <input
                      type="number"
                      min="2"
                      max={Math.floor(parsedData.length / 3)}
                      value={customSeasonalityPeriod}
                      onChange={(e) => setCustomSeasonalityPeriod(parseInt(e.target.value) || 2)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                
                {seasonalityPattern === "auto" && detectedPatterns.length > 0 && (
                  <div className="mt-2 text-xs text-green-600">
                    Using: {detectedPatterns[0].name} ({detectedPatterns[0].period} points)
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sensitivity ({sensitivityThreshold}σ)
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.1"
                  value={sensitivityThreshold}
                  onChange={(e) => setSensitivityThreshold(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>More Sensitive</span>
                  <span>Less Sensitive</span>
                </div>
                <div className="text-xs text-center text-gray-600 mt-1">
                  Current: {sensitivityThreshold} standard deviations
                </div>
              </div>
            </div>
            
            {/* Pattern Analysis Summary */}
            {parsedData.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-700">
                  <strong>Current Analysis:</strong> Using {
                    seasonalityPattern === "auto" ? `auto-detected ${detectedPatterns[0]?.name || "pattern"}` :
                    seasonalityPattern === "custom" ? `custom period of ${getSeasonalityPeriod(parsedData)} points` :
                    `${seasonalityPattern} pattern`
                  } with {getSeasonalityPeriod(parsedData)} data points per cycle
                </div>
              </div>
            )}
          </div>
        )}

        {/* Apache ECharts Visualization */}
        {parsedData.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Time Series Analysis</h2>
            <div className="bg-white border rounded-xl p-4" style={{ height: "500px" }}>
              <OptimizedChart
                option={chartOption}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          </div>
        )}

        {/* Anomaly Details Table */}
        {parsedData.filter(item => item.isAnomaly).length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detected Anomalies</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-semibold">Timestamp</th>
                      <th className="text-left p-3 font-semibold">Actual Value</th>
                      <th className="text-left p-3 font-semibold">Expected Value</th>
                      <th className="text-left p-3 font-semibold">Deviation (σ)</th>
                      <th className="text-left p-3 font-semibold">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData
                      .filter(item => item.isAnomaly)
                      .sort((a, b) => b.deviation - a.deviation)
                      .slice(0, 20)
                      .map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-3">{DateUtils.formatDate(item.timestamp)}</td>
                          <td className="p-3 font-medium">{item.value.toFixed(2)}</td>
                          <td className="p-3">{item.mean.toFixed(2)}</td>
                          <td className="p-3">
                            <span className={`font-medium ${item.signedDeviation >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {item.signedDeviation >= 0 ? '+' : ''}{item.signedDeviation.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.deviation > 3.5 ? 'bg-red-100 text-red-800' :
                              item.deviation > 3 ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.deviation > 3.5 ? 'Critical' : 
                               item.deviation > 3 ? 'High' : 'Medium'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {parsedData.filter(item => item.isAnomaly).length > 20 && (
                  <div className="p-3 text-center text-gray-500 text-sm bg-gray-100">
                    Showing top 20 anomalies by severity. Total: {parsedData.filter(item => item.isAnomaly).length}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sample Data Instructions */}
        {rawData.length === 0 && (
          <div className="mt-8 bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">Sample Data Format</h3>
            <p className="text-blue-700 mb-3">Your CSV should have timestamp and value columns like this:</p>
            <div className="bg-white p-3 rounded border font-mono text-sm">
              timestamp,value<br/>
              2024-01-01 10:00:00,100<br/>
              2024-01-01 11:00:00,95<br/>
              2024-01-01 12:00:00,102<br/>
              2024-01-01 13:00:00,150<br/>
            </div>
            <div className="mt-4 text-blue-600 text-sm space-y-1">
              <p><strong>Supported timestamp formats:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>YYYY-MM-DD HH:mm:ss (2024-01-01 10:00:00)</li>
                <li>MM/DD/YYYY HH:mm:ss (01/01/2024 10:00:00)</li>
                <li>Unix timestamps (1704110400)</li>
                <li>ISO 8601 format (2024-01-01T10:00:00Z)</li>
              </ul>
              <p className="mt-2"><strong>Column names:</strong> timestamp/time/date and value/amount/price/count are automatically detected</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

AnomalyDetection.displayName = 'AnomalyDetection';

export default AnomalyDetection;