<!-- Ref: https://cr-vue.mio3io.com/tutorials/firebase.html -->

<template>
  <div id="app">
    <header class="header">
      <h1>Chat</h1>
      <section class="auth">
        <!-- ログイン時にはフォームとログアウトボタンを表示 -->
        <div v-if="user.uid" key="login">
          [{{ user.displayName }}]
          <button type="button" @click="doLogout">Log out</button>
        </div>
        <!-- 未ログイン時にはログインボタンを表示 -->
        <div v-else key="logout">
          <button type="button" @click="doLogin">Log in</button>
        </div>
      </section>
      <section class="room">
        <!-- Already entered -->
        <div v-if="roomId">
          [{{ roomId }}]
          <button type="button" @click="onClickLeaveRoom">Leave room</button>
        </div>
        <!-- Not entered -->
        <div v-else>
          <button type="button" @click="onClickCreateRoom">Create room</button>
          <button type="button" @click="onClickEnterRoom">Enter room</button>
        </div>
      </section>
    </header>

    <!-- Firebase から取得したリストを描画（トランジション付き） -->
    <transition-group name="chat" tag="div" class="list content">
      <section v-for="{ key, name, image, text } in chat" :key="key" class="item">
        <div class="item-image">
          <img :src="image" width="40" height="40" />
        </div>
        <div class="item-detail">
          <div class="item-name">{{ name }}</div>
          <div class="item-message">
            <nl2br tag="div" :text="text" />
          </div>
        </div>
      </section>
    </transition-group>

    <!-- 入力フォーム -->
    <form action @submit.prevent="doSend" class="form">
      <textarea v-model="input" :disabled="!user.uid" @keydown.enter.exact.prevent="doSend"></textarea>
      <button type="submit" :disabled="!user.uid" class="send-button">Send</button>
    </form>

    <!-- コンポーネント MyModal -->
    <MyModal @close="closeModal" v-if="modal.visible">
      <!-- default スロットコンテンツ -->
      <p>{{ modal.message }}</p>
      <div v-if="modal.inputVisible">
        <input
          v-model="modal.input"
          pattern="[0-9]*"
          id="modal-input"
          @keydown.enter="onClickModalEnter"
          placeholder="01234"
        />
      </div>
      <!-- /default -->
      <!-- footer スロットコンテンツ -->
      <template slot="footer">
        <button type="button" @click="closeModal" style="color:#cc0000">Cancel</button>
        <button type="button" @click="onClickModalEnter">Enter</button>
      </template>
      <!-- /footer -->
    </MyModal>
  </div>
</template>

<script>
"use strict";
// firebase モジュール
import firebase from "firebase";
// 改行を <br> タグに変換するモジュール
import Nl2br from "vue-nl2br";
import { generateRandomRoomId, isValidRoomId } from "./utility.js";
import MyModal from "./components/MyModal.vue";
export default {
  components: { Nl2br, MyModal },
  data() {
    return {
      user: {}, // ユーザー情報
      chat: [], // 取得したメッセージを入れる配列
      input: "", // 入力したメッセージ
      roomId: "",
      modal: { visible: false, message: "", inputVisible: false, input: "" }
    };
  },
  created() {
    firebase.auth().onAuthStateChanged(user => {
      this.user = user ? user : {};
      if (!user) {
        if (this.roomId !== "") {
          this.leaveRoom(this.roomId);
        }
      }
    });
  },
  methods: {
    // ログイン処理
    doLogin() {
      console.log(this.user);
      if (this.user.uid) {
        alert("You are already logged in.");
        return;
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider);
    },
    // ログアウト処理
    doLogout() {
      firebase.auth().signOut();
    },
    // スクロール位置を一番下に移動
    scrollBottom() {
      this.$nextTick(() => {
        window.scrollTo(0, document.body.clientHeight);
      });
    },
    // 受け取ったメッセージをchatに追加
    // データベースに新しい要素が追加されると随時呼び出される
    childAdded(snap) {
      const message = snap.val();
      console.log("message: <next line>");
      console.log(message);
      this.chat.push({
        key: snap.key,
        name: message.name,
        image: message.image,
        text: message.text
      });
      this.scrollBottom();
    },
    doSend() {
      if (this.user.uid && this.roomId !== "" && this.input.length) {
        // firebase にメッセージを追加
        firebase
          .database()
          .ref(`data/${this.roomId}/message`)
          .push(
            {
              text: this.input,
              name: this.user.displayName,
              image: this.user.photoURL,
              createdAt: Date.now()
            },
            () => {
              this.input = ""; // フォームを空にする
            }
          );
      }
    },
    createRoom(roomId) {
      console.log(`createRoom, roomId: ${roomId}`);
      let path = `data/${roomId}`;
      const ref = firebase.database().ref(path);
      ref.update({
        createdAt: Date.now(),
        owner: firebase.auth().currentUser.uid,
        roomId: roomId
      });
      return roomId;
    },
    onClickCreateRoom() {
      // https://qiita.com/masato/items/f5c3be5da1040332c88c
      function loop(promise, fn) {
        return promise.then(fn).then(function(wrapper) {
          console.log("wrapper: ", wrapper);
          return !wrapper.done
            ? loop(Promise.resolve(wrapper.value), fn)
            : wrapper.value;
        });
      }
      function check(roomId) {
        let path = `data/${roomId}`;
        console.log("path: " + path);
        const ref = firebase.database().ref(path);
        return ref.once("value").then(snapshot => {
          const val = snapshot.val();
          console.log("val: ", val);
          return new Promise(resolve => {
            setTimeout(() => {
              if (
                snapshot.exists() &&
                (!val.owner || val.owner !== firebase.auth().currentUser.uid)
              ) {
                resolve({ done: false, value: generateRandomRoomId() });
              } else {
                resolve({ done: true, value: roomId });
              }
            }, 100);
          });
        });
      }
      loop(Promise.resolve(generateRandomRoomId()), check).then(roomId => {
        console.log("roomId: ", roomId);
        this.createRoom(roomId);
        this.enterRoom(roomId);
        return roomId;
      });
    },
    enterRoom(roomId) {
      console.log("enterRoom");
      if (!isValidRoomId(roomId)) {
        alert(`Room ID ${roomId} is not valid.`);
        return;
      }
      if (this.roomId !== "") {
        alert(`You already entered room #${this.roomId}`);
        return;
      }
      this.roomId = roomId;
      this.chat = [];
      const ref = firebase.database().ref(`data/${roomId}/message`);
      ref.limitToLast(10).on("child_added", this.childAdded);
      console.log("ref registered: " + `data/${roomId}/message`);
    },
    onClickEnterRoom() {
      console.log("onClickEnterRoom");
      Object.assign(this.modal, {
        visible: true,
        message: "Room ID",
        inputVisible: true,
        input: ""
      });
      this.$nextTick().then(() =>
        document.getElementById("modal-input").focus()
      );
    },
    leaveRoom(roomId) {
      console.log("leaveRoom");
      if (roomId !== this.roomId) {
        console.log("roomId and this.roomId differ.");
        return;
      }
      const ref = firebase.database().ref(`data/${roomId}/message`);
      ref.limitToLast(10).off("child_added", this.childAdded);
      console.log("ref un-registered: " + `data/${roomId}/message`);
      this.roomId = "";
      this.chat = [];
    },
    onClickLeaveRoom() {
      this.leaveRoom(this.roomId);
    },
    closeModal() {
      this.modal.visible = false;
    },
    onClickModalEnter() {
      this.enterRoom(this.modal.input);
      this.closeModal();
    }
  }
};
</script>

<style scoped>
* {
  margin: 0;
  box-sizing: border-box;
}
.header {
  background: #3ab383;
  margin-bottom: 1em;
  padding: 0.4em 0.8em;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.content {
  margin: 0 auto;
  padding: 0 10px;
  max-width: 600px;
}
.form {
  position: fixed;
  display: flex;
  justify-content: center;
  align-items: center;
  bottom: 0;
  height: 80px;
  width: 100%;
  background: #f5f5f5;
}
.form textarea {
  border: 1px solid #ccc;
  border-radius: 2px;
  height: 4em;
  width: calc(100% - 6em);
  resize: none;
}
.list {
  margin-bottom: 100px;
}
.item {
  position: relative;
  display: flex;
  align-items: flex-end;
  margin-bottom: 0.8em;
}
.item-image img {
  border-radius: 20px;
  vertical-align: top;
}
.item-detail {
  margin: 0 0 0 1.4em;
}
.item-name {
  font-size: 75%;
}
.item-message {
  position: relative;
  display: inline-block;
  padding: 0.8em;
  background: #deefe8;
  border-radius: 4px;
  line-height: 1.2em;
}
.item-message::before {
  position: absolute;
  content: " ";
  display: block;
  left: -16px;
  bottom: 12px;
  border: 4px solid transparent;
  border-right: 12px solid #deefe8;
}
.send-button {
  height: 4em;
}
/* トランジション用スタイル */
.chat-enter-active {
  transition: all 1s;
}
.chat-enter {
  opacity: 0;
  transform: translateX(-1em);
}
</style>
