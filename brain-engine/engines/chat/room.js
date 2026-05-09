export async function room(ctx) {
    const { type, payload, traceId } = ctx;
    
    try {
      if (type === 'CREATE_ROOM') {
        const { title, createdBy, tags, maxParticipants } = payload;
        // 방 생성 로직 구현
        const newRoom = {
          id: crypto.randomUUID(),
          title,
          createdBy: createdBy || 'anonymous',
          tags: tags || [],
          maxParticipants: maxParticipants || 100,
          participants: [],
          createdAt: new Date().toISOString()
        };
        
        return {
          ...ctx,
          payload: { room: newRoom },
          success: true
        };
      }
      
      if (type === 'LIST_ROOMS') {
        // 방 목록 조회 로직 구현
        return {
          ...ctx,
          payload: { rooms: [] },
          success: true
        };
      }
      
      return {
        ...ctx,
        _error: `Unknown room action: ${type}`
      };
    } catch (error) {
      return {
        ...ctx,
        _error: error.message
      };
    }
  }