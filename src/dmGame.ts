import { MachineConfig, send, Action, assign, actions} from "xstate";
import "./styles.scss";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { useMachine, asEffect } from "@xstate/react";
import { inspect } from "@xstate/inspect";

const {cancel}=actions

function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

function promptAndAsk(prompt: string, speechprompt:string, helpmes:string): MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: "prompt",
        states: {
            prompt: {
                entry: say(prompt),
                on: { ENDSPEECH: "ask" }
            },
            hist: {type: "history"},
            maxspeech: {
                entry: say(speechprompt),
             on: {ENDSPEECH: "ask"}
            
        },  
            ask: {
                entry: [listen(), send('MAXSPEECH', {delay: 5000, id: "maxsp"})]
            },
            help: {entry: say(helpmes),
                on: {ENDSPEECH: "hist" }
            },
            nomatch: {
                entry: say("Sorry, please say your English in a clear way"),
                on: { ENDSPEECH:  "prompt" }
            
            }
        }})
}

function hint(prompt: string, state: string): MachineConfig<SDSContext, any, SDSEvent>{
    return ({entry: say(prompt),
        on: {ENDSPEECH: state }})
}





const commands = {"help": "h", "Help": "H"}

const grammar3 ={"count": 0}

const grammar4 ={"scores": 0}


export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }
        },
		welcome: {
            initial: "prompt",
            on: {
                RECOGNISED: [{
                    target: "query",
                    cond: (context) => !(context.recResult in commands),
                    actions: [assign((context) => { return { option: context.recResult } }),assign((context) => { grammar3["count"]=0}),cancel("maxsp")],
                    
                },
                {target: ".help",
                cond: (context) => context.recResult in commands }],
                MAXSPEECH: [{target:".maxspeech",
                cond: (context) => grammar3["count"] <= 2,
                actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 } )
                },{target: "#root.dm.init", 
                cond: (context) => grammar3["count"] > 2, 
                actions:assign((context) => { grammar3["count"]=0})}]
            },
            
        ...promptAndAsk("What would you like to do?", 
        "You did not respond，just tell me what you want to do", "Please kindly tell me what you want to do")
    }, 
		query: {
            invoke: {
                id: "rasa",
                src: (context, event) => nluRequest(context.option),
                onDone: {
                    target: "menu",
                    actions: [assign((context, event) => { return  {option: event.data.intent.name} }),
                    (context: SDSContext, event: any) => console.log(event.data)]
                    //actions: assign({ intent: (context: SDSContext, event: any) =>{ return event.data }})

                },
                onError: {
                    target: "welcome",
                    actions: (context, event) => console.log(event.data)
                }
            }
        },
      
        menu: {
            initial: "prompt",
            on: {
                ENDSPEECH: [
                    { target: "todo", cond: (context) => context.option === "todo" },
                    { target: "timer", cond: (context) => context.option === "timer" },
                    { target: "game", cond: (context) => context.option === "game"}
                ]
            },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `OK. I understand，you want a ${context.option}.`
                    })),
        },
     /*            nomatch: {
                    entry: say("Sorry, I don"t understand"),
                    on: { ENDSPEECH: "prompt" }
        } */ 
            }       
        },


        todo: {
            initial: "prompt",
            on: { ENDSPEECH: "init" },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Let"s create a to do item`
                    }))
                }}
        },
        
        timer: {
            initial: "prompt",
            on: { ENDSPEECH: "init" },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Let"s create a timer`
                    }))
                }}
        },
        game: {
            initial: "prompt",
            on: { ENDSPEECH: "question1" },
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Let"s play How well do you know me and let's go to the first question`
                    }))
                }}
        },
        question1: {
            on: {
                RECOGNISED: [{
                    cond: (context) => context.recResult === "a",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint1"

                },
                {
                    cond: (context) => context.recResult === "A",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint1"

                },
                
                {
                    cond: (context) => context.recResult === "mint green",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint1"

                },
                {
                    cond: (context) => context.recResult === "b",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint2"

                },
                {
                    cond: (context) => context.recResult === "B",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint2"

                },
                
                {
                    cond: (context) => context.recResult === "purple",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint2"

                },
                { target: ".nomatch" ,
                 cond: (context) => !(context.recResult in commands),
                 actions: cancel("maxsp")},
                 {target: ".help",
                 cond: (context) => context.recResult in commands}],
                 MAXSPEECH: [{target:".maxspeech",
                 cond: (context) => grammar3["count"] <= 2,
                actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 } )
                },{target: "#root.dm.init", 
                cond: (context) => grammar3["count"] > 2, 
                actions:assign((context) => { grammar3["count"]=0})}] 
            },
             ...promptAndAsk("What colour do I like?  A, mint green, B purple", "You did not respond, please tell me the colour", "Just choose one colour")
        },
        hint1:{
            ...hint("Yes! You are right! Let's move to the next question.", "question2")  
        },
        hint2:{
            ...hint("Sorry! you are wrong! Let's move to the next question.", "question2")  
        },
        question2: {
            initial: "prompt",
            on: {
	            RECOGNISED: [{
                    cond: (context) => context.recResult === "a",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint3"

                },
                {
                    cond: (context) => context.recResult === "A",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint3"

                },
                
                {
                    cond: (context) => context.recResult === "pizza",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint3"

                },
                {
                    cond: (context) => context.recResult === "b",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint4"

                },
                {
                    cond: (context) => context.recResult === "B",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint4"

                },
                
                {
                    cond: (context) => context.recResult === "dumplings",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint4"

                },
                { target: ".nomatch" ,
                 cond: (context) => !(context.recResult in commands),
                 actions: cancel("maxsp")},
                 {target: ".help",
                 cond: (context) => context.recResult in commands}],
                 MAXSPEECH: [{target:".maxspeech",
                 cond: (context) => grammar3["count"] <= 2,
                actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 } )
                },{target: "#root.dm.init", 
                cond: (context) => grammar3["count"] > 2, 
                actions:assign((context) => { grammar3["count"]=0})}] 
	        },
            ...promptAndAsk("What's my favourite food?  A, pizza, B dumplings", "You did not respond, please tell me your answer", "Just choose one food") 
        },
        hint3:{
            ...hint("Yes! You are right! Let's continue to the next question.", "question3")  
        },
        hint4:{
            ...hint("Sorry! you are wrong! Let's contiue to the next question.", "question3")  
        },
        question3: {
            initial: "prompt",
            on: {
	            RECOGNISED: [{
                    cond: (context) => context.recResult === "b",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint5"

                },
                {
                    cond: (context) => context.recResult === "B",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint5"

                },
                
                {
                    cond: (context) => context.recResult === "lavender",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint5"

                },
                {
                    cond: (context) => context.recResult === "a",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint6"

                },
                {
                    cond: (context) => context.recResult === "A",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint6"

                },
                
                {
                    cond: (context) => context.recResult === "rosa",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint6"

                },
                { target: ".nomatch" ,
                 cond: (context) => !(context.recResult in commands),
                 actions: cancel("maxsp")},
                 {target: ".help",
                 cond: (context) => context.recResult in commands}],
                 MAXSPEECH: [{target:".maxspeech",
                 cond: (context) => grammar3["count"] <= 2,
                actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 } )
                },{target: "#root.dm.init", 
                cond: (context) => grammar3["count"] > 2, 
                actions:assign((context) => { grammar3["count"]=0})}] 
	        },
            ...promptAndAsk("What's my favourite flower?  A, rose, B lavender", "You did not respond, please tell me your answer", "Just choose one country") 
        },
        hint5:{
            ...hint("Yes! You are right! Let's continue to the next question.", "question4")  
        },
        hint6:{
            ...hint("Sorry! you are wrong! Let's contiue to the next question.", "question4")  
        },
        question4: {
            initial: "prompt",
            on: {
	            RECOGNISED: [{
                    cond: (context) => context.recResult === "b",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint7"

                },
                {
                    cond: (context) => context.recResult === "B",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint7"

                },
                
                {
                    cond: (context) => context.recResult === "cat",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint7"

                },
                {
                    cond: (context) => context.recResult === "a",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint8"

                },
                {
                    cond: (context) => context.recResult === "A",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint8"

                },
                
                {
                    cond: (context) => context.recResult === "dog",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint8"

                },
                { target: ".nomatch" ,
                 cond: (context) => !(context.recResult in commands),
                 actions: cancel("maxsp")},
                 {target: ".help",
                 cond: (context) => context.recResult in commands}],
                 MAXSPEECH: [{target:".maxspeech",
                 cond: (context) => grammar3["count"] <= 2,
                actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 } )
                },{target: "#root.dm.init", 
                cond: (context) => grammar3["count"] > 2, 
                actions:assign((context) => { grammar3["count"]=0})}] 
	        },
            ...promptAndAsk("What's my favourite pet?  A, dog, B cat", "You did not respond, please tell me your answer", "Just choose one food") 
        },
        hint7:{
            ...hint("Yes! You are right! Let's continue to the next question.", "question5")  
        },
        hint8:{
            ...hint("Sorry! you are wrong! Let's contiue to the next question.", "question5")  
        },
        question5: {
            initial: "prompt",
            on: {
	            RECOGNISED: [{
                    cond: (context) => context.recResult === "b",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint9"

                },
                {
                    cond: (context) => context.recResult === "B",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint9"

                },
                
                {
                    cond: (context) => context.recResult === "coffee",
                    actions: [assign((context) => { grammar4["scores"]= grammar4["scores"]+1} ),assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint9"

                },
                {
                    cond: (context) => context.recResult === "a",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint10"

                },
                {
                    cond: (context) => context.recResult === "A",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint10"

                },
                
                {
                    cond: (context) => context.recResult === "tea",
                    actions: [assign((context) => { grammar3["count"]=0}), cancel("maxsp")],
                    target: "hint10"

                },
                { target: ".nomatch" ,
                 cond: (context) => !(context.recResult in commands),
                 actions: cancel("maxsp")},
                 {target: ".help",
                 cond: (context) => context.recResult in commands}],
                 MAXSPEECH: [{target:".maxspeech",
                 cond: (context) => grammar3["count"] <= 2,
                actions: assign((context) => { grammar3["count"]=grammar3["count"]+1 } )
                },{target: "#root.dm.init", 
                cond: (context) => grammar3["count"] > 2, 
                actions:assign((context) => { grammar3["count"]=0})}] 
	        },
            ...promptAndAsk("What's my favourite drink?  A, tea, B coffee", "You did not respond, please tell me your answer", "Just choose one drink") 
        },
        hint9:{
            ...hint("Yes! You are right! Let's see your final score.", "conclusion")  
        },
        hint10:{
            ...hint("Sorry! you are wrong! Let's see your final score.", "conclusion")  
        },
        conclusion: {
            initial: "prompt",
            on: {
                ENDSPEECH: [
                    { target: "success", cond: (context) => grammar4["scores"] >= 3 },
                    { target: "failure", cond: (context) => grammar4["scores"] < 3 },
                ]
           }, 
            states: {
                prompt: {
                    entry: send((context) => ({
                        type: "SPEAK",
                        value: `Well,your final score is ${grammar4["scores"]} out of 5.`
                    })),
                }
            }
        },
	        success:{
                initial: "prompt",
                on: { ENDSPEECH: "init" },
                states: {
                    prompt: {
                        entry: say("Congratulations! You can have a date with me!"),
                        
                    },
                }
            },
            failure:{
                initial: "prompt",
                on: { ENDSPEECH: "init" },
                states: {
                    prompt: {
                        entry: say("Sorry, you need to try harder!"),
                        
                    },
                }
            },
        
        }
    })

			/* RASA API
 *  */
const proxyurl = "https://cors-anywhere.herokuapp.com/";
const rasaurl = "https://finalprojectgame.herokuapp.com/model/parse"
const nluRequest = (text: string) =>
    fetch(new Request(proxyurl + rasaurl, {
        method: "POST",
        headers: { "Origin": "http://localhost:3000/react-xstate-colourchanger" }, // only required with proxy
        body: `{"text": "${text}"}`
    }))
        .then(data => data.json());
