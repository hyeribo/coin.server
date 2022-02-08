//  각각의 노드, 노드의 data와 다음 노드를 가리키고 있다.
class Node {
  data!: () => any;
  next?: Node;
  constructor(data: () => any) {
    this.data = data;
  }
}

export default class Queue {
  head?: Node; // 제일 앞 노드
  rear?: Node; // 제일 뒤 노드
  length: number = 0; // 노드의 길이

  /**
   * 큐에 노드 추가
   * @param data
   */
  enqueue(data: () => any) {
    // 노드 추가.
    const node = new Node(data); // data를 가진 node를 만들어준다.
    if (!this.head) {
      // 헤드가 없을 경우 head를 해당 노드로
      this.head = node;
    } else {
      if (this.rear) {
        this.rear.next = node; // 아닐 경우 마지막의 다음 노드로
      }
    }
    this.rear = node; // 마지막을 해당 노드로 한다.
    this.length++;
  }

  /**
   * 큐에서 노드 삭제 후 리턴
   * @returns () => any
   */
  dequeue() {
    // 노드 삭제.
    if (!this.head) {
      // 헤드가 없으면 한 개도 없는 것이므로 false를 반환.
      return false;
    }
    // head를 head의 다음 것으로 바꿔주고 뺀 data를 return
    const data = this.head.data;
    this.head = this.head.next;
    this.length--;

    return data;
  }

  /**
   * head 반환
   */
  front() {
    // head가 있을 경우 head의 data를 반환.
    return this.head && this.head.data;
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
      array.push(node.data);
      node = node.next;
    }
    return array;
  }
}
