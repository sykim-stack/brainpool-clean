export async function message(ctx) {
    const { type, payload, traceId } = ctx;
    
    try {
      if (type === 'SEND_MESSAGE') {
        const { roomId, userId, original, meta } = payload;
        // 메시지 저장 로직 구현
        const newMessage = {
          id: crypto.randomUUID(),
          roomId,
          userId,
          original,
          meta: meta || {},
          createdAt: new Date().toISOString()
        };
        
        return {
          ...ctx,
          payload: { message: newMessage },
          success: true
        };
      }
      
      return {
        ...ctx,
        _error: `Unknown message action: ${type}`
      };
    } catch (error) {
      return {
        ...ctx,
        _error: error.message
      };
    }
  }