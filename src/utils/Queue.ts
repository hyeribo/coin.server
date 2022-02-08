import logger from '@src/config/winston'; //  각각의 노드, 노드의 data와 다음 노드를 가리키고 있다.
class Node {
  work!: () => any;
  next?: Node;
  constructor(work: () => any) {
    this.work = work;
  }
}

export default class Queue {
  head?: Node; // 제일 앞 노드
  rear?: Node; // 제일 뒤 노드
  length: number = 0; // 노드의 길이
  status: 'started' | 'stopped' = 'stopped';

  /**
   * 큐에 노드 추가
   * @param work
   */
  async enqueue(work: () => any) {
    // 노드 추가.
    const node = new Node(work); // work를 가진 node를 만들어준다.
    if (!this.head) {
      // 헤드가 없을 경우 head를 해당 노드로
      this.head = node;

      logger.verbose('Add node to queue. (Queue started.)', {
        main: 'Queue',
        sub: 'enqueue',
      });
      // 처음 넣는것이면 큐를 실행.
      this.continueQueue();
    } else {
      if (this.rear) {
        this.rear.next = node; // 아닐 경우 마지막의 다음 노드로

        logger.verbose('Add node to queue.', {
          main: 'Queue',
          sub: 'enqueue',
        });
      }
    }
    this.rear = node; // 마지막을 해당 노드로 한다.
    this.length++;
  }

  async continueQueue() {
    const work = this.dequeue();
    if (work) {
      logger.verbose('Execute work.', {
        main: 'Queue',
        sub: 'continueQueue',
      });
      await work();
    } else {
      logger.verbose('No node in queue. (Queue stopped.)', {
        main: 'Queue',
        sub: 'continueQueue',
      });
      return false;
    }
    this.continueQueue();
  }

  /**
   * 큐에서 맨 처음 노드 뽑기
   * @returns () => any
   */
  dequeue() {
    // 노드 삭제.
    if (!this.head) {
      // 헤드가 없으면 한 개도 없는 것이므로 false를 반환.
      return false;
    }
    // head를 head의 다음 것으로 바꿔주고 뺀 work를 return
    const work = this.head.work;
    this.head = this.head.next;
    this.length--;

    return work;
  }

  /**
   * head 반환
   */
  front() {
    // head가 있을 경우 head의 work를 반환.
    return this.head && this.head.work;
  }

  /**
   * 큐의 모든 원소를 반환하는 함수
   */
  getQueue() {
    if (!this.head) return false;
    let node: Node | undefined = this.head;
    const array = [];
    while (node) {
      // node가 없을 때까지 array에 추가한 후 반환해준다.
      array.push(node.work);
      node = node.next;
    }
    return array;
  }
}
