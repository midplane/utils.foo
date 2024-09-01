import React, { useState, useEffect } from 'react';
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
  const [currentEpoch, setCurrentEpoch] = useState(Math.floor(Date.now() / 1000));
  const [readableInfo, setReadableInfo] = useState({});

  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
  }, [epochInput]);

  useEffect(() => {
    // Initialize with current epoch time
    const now = Math.floor(Date.now() / 1000);
    setEpochInput(now.toString());
    updateHumanDateFromEpoch(now);
  }, []);

  const updateHumanDateFromEpoch = (epoch) => {
    const date = new Date(epoch * 1000);
    setHumanDate({
      year: date.getFullYear(),
      month: (date.getMonth() + 1).toString().padStart(2, '0'),
      day: date.getDate().toString().padStart(2, '0'),
      hours: date.getHours().toString().padStart(2, '0'),
      minutes: date.getMinutes().toString().padStart(2, '0'),
      seconds: date.getSeconds().toString().padStart(2, '0')
    });
    updateReadableInfo(epoch);
  };

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
    const date = new Date(epoch * 1000);
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
      milliseconds: epoch * 1000,
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
        canonicalUrl="https://utils.foo/epoch"
      />
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Epoch Converter</h1>
      
      <div className="mb-4">
        <p className="font-semibold">Current epoch time (seconds): {currentEpoch}</p>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">Epoch time (seconds)</label>
        <input
          type="text"
          value={epochInput}
          onChange={handleEpochChange}
          placeholder="Enter epoch time (seconds)"
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">Human date ({localTimezone})</label>
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
        <div className="rounded border border-gray-300 p-4">
          <h2 className="text-xl font-semibold mb-4">Timestamp Information</h2>
          <div className="grid grid-cols-2 gap-2">
            <p className="font-medium">Timestamp in milliseconds:</p>
            <p className="text-right">{readableInfo.milliseconds}</p>

            <p className="font-medium">Your time zone:</p>
            <p className="text-right">{readableInfo.localTime}</p>
            
            <p className="font-medium">UTC:</p>
            <p className="text-right">{readableInfo.utcTime}</p>
            
            <p className="font-medium">Relative:</p>
            <p className="text-right">{readableInfo.relative}</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}