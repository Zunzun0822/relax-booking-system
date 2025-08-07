import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Phone, User, Plus, Trash2, Edit3 } from 'lucide-react';

const RestaurantBookingSystem = () => {
  const [bookings, setBookings] = useState([]);
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

  // 桌位配置
  const tables = {
    A: [
      ...Array.from({length: 4}, (_, i) => ({
        id: `A${i + 1}`,
        capacity: 2,
        name: `A${i + 1}桌 (2人)`
      })),
      {
        id: 'A5',
        capacity: 3,
        name: 'A5桌 (3人)'
      }
    ],
    B: Array.from({length: 2}, (_, i) => ({
      id: `B${i + 1}`,
      capacity: 4,
      name: `B${i + 1}桌 (4人)`
    })),
    C: [
      {
        id: 'C1',
        capacity: 4,
        name: 'C1桌 (4人)'
      },
      {
        id: 'C2',
        capacity: 4,
        name: 'C2桌 (4人)'
      },
      {
        id: 'C3',
        capacity: 3,
        name: 'C3桌 (3人)'
      }
    ]
  };

  const allTables = [...tables.A, ...tables.B, ...tables.C];

  // 新增/編輯訂位表單狀態
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    partySize: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    tableIds: [], // 改為陣列支援多桌
    notes: ''
  });

  const [suggestedCombination, setSuggestedCombination] = useState(null);

  // 獲取指定桌位在指定日期的訂位
  const getTableBookings = (tableId, date) => {
    return bookings.filter(booking => 
      (booking.tableIds || [booking.tableId]).includes(tableId) && 
      booking.date === date
    ).sort((a, b) => a.time.localeCompare(b.time));
  };

  // 計算下一個可用時間
  const getNextAvailableTime = (tableId, date) => {
    const tableBookings = getTableBookings(tableId, date);
    if (tableBookings.length === 0) {
      return "立即可安排";
    }
    
    const lastBooking = tableBookings[tableBookings.length - 1];
    const [hours, minutes] = lastBooking.time.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(hours, minutes + 90, 0, 0);
    
    return `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')} 後可安排`;
  };

  // 檢查時間衝突 - 支援多桌位
  const hasTimeConflict = (tableIds, date, time, excludeId = null) => {
    // 如果是單一桌位，轉換為陣列
    const tableIdArray = Array.isArray(tableIds) ? tableIds : [tableIds];
    
    return tableIdArray.some(tableId => {
      const tableBookings = getTableBookings(tableId, date)
        .filter(booking => booking.id !== excludeId);
      
      const [newHours, newMinutes] = time.split(':').map(Number);
      const newStartTime = newHours * 60 + newMinutes;
      const newEndTime = newStartTime + 90;
      
      return tableBookings.some(booking => {
        const [bookingHours, bookingMinutes] = booking.time.split(':').map(Number);
        const bookingStartTime = bookingHours * 60 + bookingMinutes;
        const bookingEndTime = bookingStartTime + 90;
        
        return (newStartTime < bookingEndTime && newEndTime > bookingStartTime);
      });
    });
  };

  // 當人數改變時，清空桌位選擇
  useEffect(() => {
    // 人數改變時清空桌位選擇
    if (formData.partySize) {
      setFormData(prev => ({ ...prev, tableIds: [] }));
    }
  }, [formData.partySize]);

  // 檢查桌位容量警告
  const getCapacityWarning = () => {
    if (formData.tableIds.length === 0 || !formData.partySize) return null;
    
    const totalCapacity = formData.tableIds.reduce((sum, id) => {
      const table = allTables.find(t => t.id === id);
      return sum + (table ? table.capacity : 0);
    }, 0);
    
    if (totalCapacity < formData.partySize) {
      return {
        type: 'warning',
        message: `注意：所選桌位總容量 ${totalCapacity} 人，少於用餐人數 ${formData.partySize} 人`
      };
    }
    
    if (totalCapacity > formData.partySize + 2) {
      return {
        type: 'info',
        message: `提醒：所選桌位總容量 ${totalCapacity} 人，可能會有座位浪費`
      };
    }
    
    return null;
  };

  const handleSubmit = () => {
    // 驗證表單
    if (!formData.customerName || !formData.phone || !formData.time || !formData.partySize) {
      alert('請填寫所有必填欄位');
      return;
    }

    if (formData.tableIds.length === 0) {
      alert('請選擇至少一個桌位');
      return;
    }

    // 檢查容量警告並詢問確認
    const warning = getCapacityWarning();
    if (warning && warning.type === 'warning') {
      if (!window.confirm(`${warning.message}\n\n是否仍要繼續建立訂位？`)) {
        return;
      }
    }

    const finalTableIds = formData.tableIds;
    const tableNames = formData.tableIds.map(id => allTables.find(t => t.id === id)?.name || id);

    // 檢查時間衝突
    if (hasTimeConflict(finalTableIds, formData.date, formData.time, editingBooking?.id)) {
      alert('選擇的桌位在此時段已有訂位，請選擇其他時間');
      return;
    }

    const bookingData = {
      ...formData,
      id: editingBooking ? editingBooking.id : Date.now().toString(),
      tableIds: finalTableIds,
      tableNames: tableNames,
      // 為了向下相容，保留單一 tableId
      tableId: finalTableIds[0],
      tableName: tableNames.join(' + ')
    };

    if (editingBooking) {
      setBookings(bookings.map(booking => 
        booking.id === editingBooking.id ? bookingData : booking
      ));
      setEditingBooking(null);
    } else {
      setBookings([...bookings, bookingData]);
    }

    // 重置表單
    setFormData({
      customerName: '',
      phone: '',
      partySize: '',
      date: currentDate,
      time: '',
      tableIds: [],
      notes: ''
    });
    setIsAddingBooking(false);
    setSuggestedCombination(null);
  };

  const handleEdit = (booking) => {
    const editFormData = {
      ...booking,
      tableIds: booking.tableIds || [booking.tableId] // 向下相容
    };
    setFormData(editFormData);
    setEditingBooking(booking);
    setIsAddingBooking(true);
  };

  const handleDelete = (bookingId) => {
    if (window.confirm('確定要刪除此訂位嗎？')) {
      setBookings(bookings.filter(booking => booking.id !== bookingId));
    }
  };

  const cancelEdit = () => {
    setFormData({
      customerName: '',
      phone: '',
      partySize: '',
      date: currentDate,
      time: '',
      tableIds: [],
      notes: ''
    });
    setEditingBooking(null);
    setIsAddingBooking(false);
    setSuggestedCombination(null);
  };

  // 獲取當日訂位
  const todayBookings = bookings
    .filter(booking => booking.date === currentDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
          <Calendar className="mr-3 text-blue-600" />
          餐廳訂位管理系統
        </h1>
        <p className="text-gray-600">數位化訂位管理，提升餐廳營運效率</p>
      </div>

      {/* 日期選擇和快速操作 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <Calendar className="text-blue-600" size={20} />
              <span className="font-medium">查看日期：</span>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
          </div>
          
          <button
            onClick={() => setIsAddingBooking(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>新增訂位</span>
          </button>
        </div>
      </div>

      {/* 桌位狀態總覽 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">桌位狀態總覽 - {currentDate}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {allTables.map(table => {
            const tableBookings = getTableBookings(table.id, currentDate);
            const nextAvailable = getNextAvailableTime(table.id, currentDate);
            
            return (
              <div key={table.id} className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium text-center text-gray-800 mb-2">{table.name}</h3>
                <div className="text-sm text-center">
                  <div className="text-blue-600 mb-1">
                    訂位: {tableBookings.length}組
                  </div>
                  <div className="text-green-600 text-xs">
                    {nextAvailable}
                  </div>
                </div>
                {tableBookings.length > 0 && (
                  <div className="mt-2 text-xs">
                    {tableBookings.map(booking => (
                      <div key={booking.id} className="bg-red-100 text-red-700 px-2 py-1 rounded mb-1">
                        {booking.time} - {booking.customerName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 新增/編輯訂位表單 */}
        {isAddingBooking && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {editingBooking ? '編輯訂位' : '新增訂位'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="inline w-4 h-4 mr-1" />
                    客人姓名 *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="inline w-4 h-4 mr-1" />
                    電話號碼 *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Users className="inline w-4 h-4 mr-1" />
                    用餐人數 *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.partySize}
                    onChange={(e) => setFormData({...formData, partySize: e.target.value ? parseInt(e.target.value) : '', tableIds: []})}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="請輸入用餐人數"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    訂位日期 *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="inline w-4 h-4 mr-1" />
                    訂位時間 *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* 桌位選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  選擇桌位 *
                </label>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {allTables.map(table => (
                    <label key={table.id} className="flex items-center space-x-2 text-sm border rounded-md p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.tableIds.includes(table.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, tableIds: [...formData.tableIds, table.id]});
                          } else {
                            setFormData({...formData, tableIds: formData.tableIds.filter(id => id !== table.id)});
                          }
                        }}
                        className="rounded"
                      />
                      <span className="flex-1">{table.name}</span>
                    </label>
                  ))}
                </div>

                {/* 容量顯示和警告 */}
                {formData.tableIds.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-blue-600">
                      已選 {formData.tableIds.length} 桌，總容量：
                      {formData.tableIds.reduce((sum, id) => {
                        const table = allTables.find(t => t.id === id);
                        return sum + (table ? table.capacity : 0);
                      }, 0)} 人
                    </div>
                    
                    {/* 容量警告 */}
                    {(() => {
                      const warning = getCapacityWarning();
                      if (warning) {
                        return (
                          <div className={`text-sm p-2 rounded ${
                            warning.type === 'warning' 
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {warning.message}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備註
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="特殊需求、過敏資訊等..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingBooking ? '更新訂位' : '確認訂位'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 當日訂位列表 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            當日訂位 ({currentDate})
          </h2>
          
          {todayBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="mx-auto mb-4" size={48} />
              <p>今日尚無訂位</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {todayBookings.map(booking => (
                <div key={booking.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="text-blue-600" size={16} />
                        <span className="font-medium text-lg">{booking.time}</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {booking.tableName}
                        </span>
                        {(booking.tableIds ? booking.tableIds.length > 1 : false) && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                            多桌組合
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User size={14} className="mr-2" />
                          {booking.customerName}
                        </div>
                        <div className="flex items-center">
                          <Phone size={14} className="mr-2" />
                          {booking.phone}
                        </div>
                        <div className="flex items-center">
                          <Users size={14} className="mr-2" />
                          {booking.partySize}人
                        </div>
                        <div className="text-green-600">
                          預計{(() => {
                            const [hours, minutes] = booking.time.split(':').map(Number);
                            const endTime = new Date();
                            endTime.setHours(hours, minutes + 90, 0, 0);
                            return `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
                          })()} 結束
                        </div>
                      </div>
                      
                      {booking.notes && (
                        <div className="mt-2 text-sm text-gray-500 bg-yellow-50 p-2 rounded">
                          備註: {booking.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(booking)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="編輯"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(booking.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="刪除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantBookingSystem;