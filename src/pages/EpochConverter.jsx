import { useState, useEffect, useCallback } from 'react';
import SEO from '../SEO';

export default function EpochConverter() {
  const [epochInput, setEpochInput] = useState('');
  const [humanDate, setHumanDate] = useState({
    year: '',
    month: '',
    day: '',
    hours: '',
    minutes: '',
    seconds: ''
  });
  const [, setCurrentEpoch] = useState(Math.floor(Date.now() / 1000));
  const [readableInfo, setReadableInfo] = useState({});

  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const getRelativeTime = useCallback((date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  }, []);

  const updateHumanDateFromEpoch = useCallback((epoch) => {
    const date = new Date(epoch * (epoch > 1e12 ? 1 : 1000));
    setHumanDate({
      year: date.getFullYear().toString(),
      month: (date.getMonth() + 1).toString().padStart(2, '0'),
      day: date.getDate().toString().padStart(2, '0'),
      hours: date.getHours().toString().padStart(2, '0'),
      minutes: date.getMinutes().toString().padStart(2, '0'),
      seconds: date.getSeconds().toString().padStart(2, '0')
    });

    setReadableInfo({
      localTime: date.toLocaleString(),
      utcTime: date.toUTCString(),
      isoString: date.toISOString(),
      relativeTime: getRelativeTime(date)
    });
  }, [getRelativeTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setCurrentEpoch(now);
      if (epochInput === '') {
        setEpochInput(now.toString());
        updateHumanDateFromEpoch(now);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [epochInput, updateHumanDateFromEpoch]);

  useEffect(() => {
    // Initialize with current epoch time
    const now = Math.floor(Date.now() / 1000);
    setEpochInput(now.toString());
    updateHumanDateFromEpoch(now);
  }, [updateHumanDateFromEpoch]);


  const handleEpochChange = (e) => {
    const value = e.target.value;
    setEpochInput(value);
    
    if (value.length > 0) {
      const epoch = parseInt(value, 10);
      updateHumanDateFromEpoch(epoch);
    }
  };

  const handleHumanDateChange = (e) => {
    const { name, value } = e.target;
    setHumanDate(prevDate => ({ ...prevDate, [name]: value }));
    
    const updatedHumanDate = { ...humanDate, [name]: value };
    const date = new Date(
      updatedHumanDate.year,
      parseInt(updatedHumanDate.month) - 1,
      updatedHumanDate.day,
      updatedHumanDate.hours,
      updatedHumanDate.minutes,
      updatedHumanDate.seconds
    );
    
    const epoch = Math.floor(date.getTime() / 1000);
    setEpochInput(epoch.toString());
    updateReadableInfo(epoch);
  };

  const updateReadableInfo = (epoch) => {
    const isMilliseconds = epoch > 1e12;
    const date = new Date(isMilliseconds ? epoch : epoch * 1000);
    const options = {
      timeZone: localTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'shortOffset'
    };

    const localDate = new Intl.DateTimeFormat('en-US', options).format(date);
    const utcDate = new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);

    const now = new Date();
    const diffInSeconds = Math.floor((date - now) / 1000);
    const relative = formatRelativeTime(diffInSeconds);
    
    setReadableInfo({
      milliseconds: isMilliseconds ? epoch : epoch * 1000,
      seconds: isMilliseconds ? Math.floor(epoch / 1000) : epoch,
      localTime: localDate,
      utcTime: utcDate,
      relative: relative
    });
  };

  const formatRelativeTime = (seconds) => {
    const units = [
      { name: 'year', seconds: 31536000 },
      { name: 'month', seconds: 2592000 },
      { name: 'day', seconds: 86400 },
      { name: 'hour', seconds: 3600 },
      { name: 'minute', seconds: 60 },
      { name: 'second', seconds: 1 }
    ];

    for (let { name, seconds: unitSeconds } of units) {
      const interval = Math.floor(Math.abs(seconds) / unitSeconds);
      if (interval >= 1) {
        return `${interval} ${name}${interval !== 1 ? 's' : ''} ${seconds < 0 ? 'ago' : 'from now'}`;
      }
    }
    return 'just now';
  };

  return (
    <>
    <SEO 
        title="Epoch Converter | utils.foo"
        description="Convert epoch/unix timestamps to human-readable dates and vice versa"
        keywords="epoch convertor, time converter"
      />
    <div className="max-w-2xl mx-auto px-8 py-8 shadow-md bg-white rounded-lg bg-opacity-75">
      <h1 className="text-3xl border-b pb-2 mb-6">Epoch Converter</h1>
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium leading-6 text-gray-900">Epoch time (seconds or milliseconds)</label>
        <input
          type="text"
          value={epochInput}
          onChange={handleEpochChange}
          placeholder="Enter epoch time (seconds or milliseconds)"
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium leading-6 text-gray-900">Human date ({localTimezone})</label>
        <div className="flex space-x-2">
          <input name="year" value={humanDate.year} onChange={handleHumanDateChange} placeholder="YYYY" className="w-20 p-2 border border-gray-300 rounded" />
          <input name="month" value={humanDate.month} onChange={handleHumanDateChange} placeholder="MM" className="w-16 p-2 border border-gray-300 rounded" />
          <input name="day" value={humanDate.day} onChange={handleHumanDateChange} placeholder="DD" className="w-16 p-2 border border-gray-300 rounded" />
          <input name="hours" value={humanDate.hours} onChange={handleHumanDateChange} placeholder="HH" className="w-16 p-2 border border-gray-300 rounded" />
          <input name="minutes" value={humanDate.minutes} onChange={handleHumanDateChange} placeholder="mm" className="w-16 p-2 border border-gray-300 rounded" />
          <input name="seconds" value={humanDate.seconds} onChange={handleHumanDateChange} placeholder="ss" className="w-16 p-2 border border-gray-300 rounded" />
        </div>
      </div>
      
      <div className="mt-8">
        <div className="rounded border border-gray-300 p-4 text-sm leading-6 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <p className="font-medium">Timestamp in milliseconds</p>
            <p className="text-right">{readableInfo.milliseconds}</p>

            <p className="font-medium">Timestamp in seconds</p>
            <p className="text-right">{readableInfo.seconds}</p>

            <p className="font-medium">Your time zone</p>
            <p className="text-right">{readableInfo.localTime}</p>
            
            <p className="font-medium">UTC</p>
            <p className="text-right">{readableInfo.utcTime}</p>
            
            <p className="font-medium">Relative</p>
            <p className="text-right">{readableInfo.relative}</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}