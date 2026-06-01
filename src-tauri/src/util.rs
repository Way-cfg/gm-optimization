use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn cmd(program: &str) -> Command {
    let mut c = Command::new(program);
    c.creation_flags(CREATE_NO_WINDOW);
    c
}
